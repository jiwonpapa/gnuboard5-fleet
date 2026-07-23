<?php

declare(strict_types=1);

namespace Api\Auth\External\Provider;

use Api\Auth\External\Contracts\ExternalAuthHttpClient;
use Api\Auth\External\Contracts\ExternalAuthProviderAdapter;
use Api\Auth\External\Provider\Support\KakaoExternalAuthResultMapper;
use Api\Auth\External\Support\ExternalAuthProviderConfig;
use Api\Auth\External\Support\ExternalAuthProviderEndpointCatalog;
use Api\Core\Config\G5Config;
use Api\Core\Config\RuntimeProfile;
use Api\Support\Exception\ApiException;

final readonly class KakaoExternalAuthProviderAdapter implements ExternalAuthProviderAdapter
{
    /** @var list<string> */
    private const SUPPORTED_FLOWS = ['login', 'account_link'];

    /** @var list<string> */
    private const DEFAULT_SCOPES = ['account_email', 'profile'];

    public function __construct(
        private G5Config $g5Config,
        private ExternalAuthHttpClient $httpClient,
        private ExternalAuthProviderEndpointCatalog $endpointCatalog,
        private ExternalAuthProviderConfig $providerConfig,
        private RuntimeProfile $runtimeProfile
    ) {
    }

    public function provider(): string
    {
        return 'kakao';
    }

    public function isConfigured(): bool
    {
        return $this->isEnabled() && $this->clientId() !== '';
    }

    public function describe(): array
    {
        return [
            'provider' => $this->provider(),
            'label' => 'Kakao Login',
            'mode' => $this->providerMode(),
            'description' => 'Kakao Login REST API 기반 외부 로그인 공급자입니다. REST API 키와 등록된 redirect URI로 authorize/code/userinfo 흐름을 정규화합니다.',
            'flows' => self::SUPPORTED_FLOWS,
            'sandbox_available' => true,
            'replay_supported' => false,
        ];
    }

    public function start(array $request): array
    {
        $this->assertConfigured();

        $flow = $this->normalizeFlow((string)($request['flow'] ?? 'login'));
        $scopes = $this->resolveScopes($request['scopes'] ?? []);
        $query = [
            'client_id' => $this->clientId(),
            'redirect_uri' => (string)($request['callback_url'] ?? ''),
            'response_type' => 'code',
            'state' => (string)($request['state'] ?? ''),
        ];

        if ($scopes !== []) {
            $query['scope'] = implode(',', $scopes);
        }

        return [
            'provider_mode' => $this->providerMode(),
            'authorization_url' => $this->authorizeEndpoint() . '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986),
            'callback_method' => 'GET',
            'provider_meta' => [
                'scopes' => $scopes,
                'authorize_endpoint' => $this->authorizeEndpoint(),
                'flow' => $flow,
            ],
        ];
    }

    /**
     * @return array{
     *     status:string,
     *     provider_tx_id:string,
     *     retryable:bool,
     *     user_action_required:bool,
     *     error_code:?string,
     *     error_message:?string,
     *     provider_user?:array<string,mixed>|null,
     *     provider_payload?:array<string,mixed>,
     *     provider_meta?:array<string,mixed>
     * }
     */
    public function complete(array $request): array
    {
        $this->assertConfigured();

        $this->normalizeFlow((string)($request['flow'] ?? 'login'));
        $resultMapper = new KakaoExternalAuthResultMapper($this->providerMode());

        $payload = is_array($request['payload'] ?? null) ? $request['payload'] : [];
        $payloadError = $resultMapper->mapProviderError($payload);
        if ($payloadError !== null) {
            return $payloadError;
        }

        $code = trim((string)($request['code'] ?? ($payload['code'] ?? '')));
        if ($code === '') {
            throw ApiException::badRequest('kakao authorization code가 필요합니다.');
        }

        $claims = is_array($request['claims'] ?? null) ? $request['claims'] : [];
        $callbackUrl = trim((string)($claims['callback_url'] ?? ''));
        if ($callbackUrl === '') {
            throw ApiException::badRequest('kakao callback_url이 request_token에 없습니다.');
        }

        $tokenForm = [
            'grant_type' => 'authorization_code',
            'client_id' => $this->clientId(),
            'redirect_uri' => $callbackUrl,
            'code' => $code,
        ];

        $clientSecret = $this->clientSecret();
        if ($clientSecret !== '') {
            $tokenForm['client_secret'] = $clientSecret;
        }

        $tokenResponse = $this->httpClient->postForm($this->tokenEndpoint(), $tokenForm);
        if (($tokenResponse['status'] ?? 0) < 200 || ($tokenResponse['status'] ?? 0) >= 300) {
            return $resultMapper->mapRemoteFailure('token', $tokenResponse);
        }

        $tokenBody = $tokenResponse['body'] ?? null;
        if (!is_array($tokenBody)) {
            return $resultMapper->invalidTokenResponse((string)($tokenResponse['raw_body'] ?? ''));
        }

        $accessToken = trim((string)($tokenBody['access_token'] ?? ''));
        if ($accessToken === '') {
            return $resultMapper->missingAccessToken($tokenBody);
        }

        $userInfoResponse = $this->httpClient->getJson($this->userinfoEndpoint(), [
            'Authorization' => 'Bearer ' . $accessToken,
        ]);
        if (($userInfoResponse['status'] ?? 0) < 200 || ($userInfoResponse['status'] ?? 0) >= 300) {
            return $resultMapper->mapRemoteFailure('userinfo', $userInfoResponse);
        }

        $userInfo = $userInfoResponse['body'] ?? null;
        if (!is_array($userInfo)) {
            return $resultMapper->invalidUserinfoResponse((string)($userInfoResponse['raw_body'] ?? ''));
        }

        return $resultMapper->success((string)($request['request_token'] ?? ''), $tokenBody, $userInfo, $this->userinfoEndpoint());
    }

    private function assertConfigured(): void
    {
        if ($this->isConfigured()) {
            return;
        }

        throw ApiException::forbidden('kakao 외부 인증 설정이 완료되지 않았습니다.');
    }

    private function providerMode(): string
    {
        return $this->runtimeProfile->isProd() ? 'live' : 'sandbox';
    }

    private function authorizeEndpoint(): string
    {
        return $this->providerConfig->providerString('kakao', 'authorize_url', $this->endpointCatalog->endpoint('kakao', 'authorize'));
    }

    private function tokenEndpoint(): string
    {
        return $this->providerConfig->providerString('kakao', 'token_url', $this->endpointCatalog->endpoint('kakao', 'token'));
    }

    private function userinfoEndpoint(): string
    {
        return $this->providerConfig->providerString('kakao', 'userinfo_url', $this->endpointCatalog->endpoint('kakao', 'userinfo'));
    }

    private function clientId(): string
    {
        return $this->providerConfig->providerString('kakao', 'client_id', (string)$this->g5Config->get('cf_kakao_rest_key', ''));
    }

    private function clientSecret(): string
    {
        return $this->providerConfig->providerString('kakao', 'client_secret', (string)$this->g5Config->get('cf_kakao_client_secret', ''));
    }

    private function isEnabled(): bool
    {
        return $this->providerConfig->providerEnabled('kakao', true);
    }

    private function normalizeFlow(string $flow): string
    {
        $normalized = strtolower(trim($flow));
        if (!in_array($normalized, self::SUPPORTED_FLOWS, true)) {
            throw ApiException::badRequest('kakao provider는 login, account_link flow만 지원합니다.');
        }

        return $normalized;
    }

    /**
     * @param mixed $scopes
     * @return list<string>
     */
    private function resolveScopes(mixed $scopes): array
    {
        $resolved = [];
        if (is_array($scopes)) {
            foreach ($scopes as $scope) {
                $normalized = trim((string)$scope);
                if ($normalized !== '') {
                    $resolved[$normalized] = true;
                }
            }
        }

        foreach (self::DEFAULT_SCOPES as $scope) {
            $resolved[$scope] = true;
        }

        return array_keys($resolved);
    }

}
