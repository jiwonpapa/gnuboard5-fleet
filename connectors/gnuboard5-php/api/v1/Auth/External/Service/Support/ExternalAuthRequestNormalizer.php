<?php

declare(strict_types=1);

namespace Api\Auth\External\Service\Support;

use Api\Auth\External\Support\ExternalAuthConfig;

final class ExternalAuthRequestNormalizer
{
    private readonly ExternalAuthInputValueNormalizer $valueNormalizer;
    private readonly ExternalAuthStateResolver $stateResolver;

    public function __construct(
        ExternalAuthConfig $config,
        ?ExternalAuthInputValueNormalizer $valueNormalizer = null,
        ?ExternalAuthStateResolver $stateResolver = null
    ) {
        $this->valueNormalizer = $valueNormalizer ?? new ExternalAuthInputValueNormalizer($config);
        $this->stateResolver = $stateResolver ?? new ExternalAuthStateResolver($this->valueNormalizer);
    }

    public function normalizeProvider(string $provider): string
    {
        return $this->valueNormalizer->normalizeProvider($provider);
    }

    /**
     * @param array<string, mixed> $input
     * @return array{
     *     flow:string,
     *     callback_url:string,
     *     scopes:list<string>,
     *     metadata:array<string, mixed>,
     *     scenario:?string,
     *     state:string
     * }
     */
    public function normalizeStartInput(array $input): array
    {
        return [
            'flow' => $this->valueNormalizer->normalizeFlow($input['flow'] ?? 'login'),
            'callback_url' => $this->valueNormalizer->normalizeCallbackUrl((string)($input['callback_url'] ?? '')),
            'scopes' => $this->valueNormalizer->normalizeStringList($input['scopes'] ?? []),
            'metadata' => $this->valueNormalizer->normalizeAssociativeArray($input['metadata'] ?? []),
            'scenario' => $this->valueNormalizer->normalizeScenario($input['scenario'] ?? null),
            'state' => $this->stateResolver->resolveStartState((string)($input['state'] ?? '')),
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @param array<string, mixed> $claims
     * @return array{
     *     flow:string,
     *     payload:array<string, mixed>,
     *     code:?string,
     *     scenario:?string,
     *     state:string,
     *     expected_state:string
     * }
     */
    public function normalizeCompleteInput(array $input, array $claims): array
    {
        $payload = $this->valueNormalizer->normalizeAssociativeArray($input['payload'] ?? []);
        $stateInfo = $this->stateResolver->resolveCompleteState($input, $payload, $claims);

        return [
            'flow' => $this->valueNormalizer->normalizeFlow((string)($claims['flow'] ?? 'login')),
            'payload' => $payload,
            'code' => $this->valueNormalizer->normalizeOptionalString($input['code'] ?? null),
            'scenario' => $this->valueNormalizer->normalizeScenario($input['scenario'] ?? null),
            'state' => $stateInfo['state'],
            'expected_state' => $stateInfo['expected_state'],
        ];
    }
}
