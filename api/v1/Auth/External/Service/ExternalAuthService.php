<?php

declare(strict_types=1);

namespace Api\Auth\External\Service;

use Api\Auth\External\Service\Support\ExternalAuthRequestNormalizer;
use Api\Auth\External\Service\Support\ExternalAuthResultBuilder;
use Api\Auth\External\Support\ExternalAuthConfig;
use Api\Auth\External\Support\ExternalAuthRequestTokenCodec;
use Api\Core\Config\RuntimeProfile;
use Api\Support\Exception\ApiException;
use Psr\Log\LoggerInterface;

final readonly class ExternalAuthService
{
    public function __construct(
        private ExternalAuthProviderRegistry $registry,
        private ExternalAuthLinkageService $linkageService,
        private ExternalAuthRequestTokenCodec $requestTokenCodec,
        private ExternalAuthConfig $config,
        private RuntimeProfile $runtimeProfile,
        private LoggerInterface $logger
    ) {
    }

    /**
     * @return list<array{
     *     provider:string,
     *     label:string,
     *     mode:string,
     *     description:string,
     *     flows:list<string>,
     *     sandbox_available:bool,
     *     replay_supported:bool,
     *     runtime_replay_enabled:bool
     * }>
     */
    public function listProviders(): array
    {
        $providers = $this->registry->describeAvailable();

        return array_values(
            array_map(function (array $provider): array {
                $provider['runtime_replay_enabled'] = $this->config->allowReplayScenarios
                    && (bool)$provider['replay_supported'];

                return $provider;
            }, $providers)
        );
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function start(string $provider, array $input): array
    {
        $requestNormalizer = $this->requestNormalizer();
        $resultBuilder = $this->resultBuilder();
        $normalizedProvider = $requestNormalizer->normalizeProvider($provider);
        $adapter = $this->registry->resolve($normalizedProvider);
        $request = $requestNormalizer->normalizeStartInput($input);

        $requestToken = $this->requestTokenCodec->issue([
            'provider' => $normalizedProvider,
            'flow' => $request['flow'],
            'callback_url' => $request['callback_url'],
            'state' => $request['state'],
            'scenario' => $request['scenario'],
        ]);

        $adapterResult = $adapter->start([
            'provider' => $normalizedProvider,
            'flow' => $request['flow'],
            'callback_url' => $request['callback_url'],
            'state' => $request['state'],
            'request_token' => $requestToken,
            'scopes' => $request['scopes'],
            'scenario' => $request['scenario'],
            'metadata' => $request['metadata'],
            'expires_in' => $this->config->requestTtlSeconds,
        ]);

        $this->logger->info('external_auth.start', [
            'provider' => $normalizedProvider,
            'flow' => $request['flow'],
            'runtime_mode' => $this->runtimeProfile->mode->value,
        ]);

        return $resultBuilder->buildStartResponse(
            $normalizedProvider,
            $request,
            $requestToken,
            $adapterResult,
            $this->config->requestTtlSeconds
        );
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function complete(string $provider, array $input): array
    {
        $requestNormalizer = $this->requestNormalizer();
        $resultBuilder = $this->resultBuilder();
        $normalizedProvider = $requestNormalizer->normalizeProvider($provider);
        $adapter = $this->registry->resolve($normalizedProvider);
        $requestToken = trim((string)($input['request_token'] ?? ''));
        $claims = $this->requestTokenCodec->decode($requestToken);

        if (($claims['provider'] ?? null) !== $normalizedProvider) {
            throw ApiException::unauthorized('외부 인증 요청의 provider가 일치하지 않습니다.');
        }

        $request = $requestNormalizer->normalizeCompleteInput($input, $claims);

        $adapterResult = $adapter->complete([
            'provider' => $normalizedProvider,
            'flow' => $request['flow'],
            'request_token' => $requestToken,
            'state' => $request['state'] !== '' ? $request['state'] : $request['expected_state'],
            'payload' => $request['payload'],
            'code' => $request['code'],
            'scenario' => $request['scenario'] ?? ($claims['scenario'] ?? null),
            'claims' => $claims,
        ]);

        $completion = $resultBuilder->buildCompletionOutcome($normalizedProvider, $request['flow'], $adapterResult);
        $linkage = $this->linkageService->resolve($normalizedProvider, $completion['provider_user']);

        $this->logger->info('external_auth.complete', [
            'provider' => $normalizedProvider,
            'flow' => $request['flow'],
            'status' => $completion['status'],
            'runtime_mode' => $this->runtimeProfile->mode->value,
        ]);

        return $resultBuilder->buildCompleteResponse($requestToken, $request['expected_state'], $completion, $linkage);
    }

    /**
     * Lazily build stateless helpers to keep the public constructor stable for existing tests and callers.
     */
    private function requestNormalizer(): ExternalAuthRequestNormalizer
    {
        return new ExternalAuthRequestNormalizer($this->config);
    }

    private function resultBuilder(): ExternalAuthResultBuilder
    {
        return new ExternalAuthResultBuilder($this->requestTokenCodec);
    }
}
