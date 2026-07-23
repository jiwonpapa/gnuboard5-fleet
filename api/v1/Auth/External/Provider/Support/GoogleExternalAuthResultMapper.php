<?php

declare(strict_types=1);

namespace Api\Auth\External\Provider\Support;

final class GoogleExternalAuthResultMapper
{
    private readonly GoogleExternalAuthFailureBuilder $failureBuilder;
    private readonly GoogleExternalAuthSuccessBuilder $successBuilder;

    public function __construct(
        private string $providerMode,
        ?GoogleExternalAuthFailureBuilder $failureBuilder = null,
        ?GoogleExternalAuthSuccessBuilder $successBuilder = null
    ) {
        $this->failureBuilder = $failureBuilder ?? new GoogleExternalAuthFailureBuilder($this->providerMode);
        $this->successBuilder = $successBuilder ?? new GoogleExternalAuthSuccessBuilder($this->providerMode, $this->failureBuilder);
    }

    /**
     * @param array<string,mixed> $payload
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
     * }|null
     */
    public function mapProviderError(array $payload): ?array
    {
        $error = strtolower(trim((string)($payload['error'] ?? '')));
        if ($error === '') {
            return null;
        }

        $message = trim((string)($payload['error_description'] ?? ''));

        return match ($error) {
            'access_denied' => $this->failure(
                'cancelled',
                'google.access_denied',
                $message !== '' ? $message : '사용자가 Google 인증을 취소했습니다.',
                true,
                true,
                $payload
            ),
            'interaction_required', 'login_required', 'consent_required' => $this->failure(
                'requires_user_action',
                'google.' . $error,
                $message !== '' ? $message : 'Google 인증에 추가 사용자 동작이 필요합니다.',
                true,
                true,
                $payload
            ),
            default => $this->failure(
                'failed',
                'google.' . $error,
                $message !== '' ? $message : 'Google 인증이 실패했습니다.',
                false,
                false,
                $payload
            ),
        };
    }

    /**
     * @param array{status:int, body:array<string,mixed>|null, raw_body:string} $response
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
    public function mapRemoteFailure(string $stage, array $response): array
    {
        $body = is_array($response['body'] ?? null) ? $response['body'] : [];
        $error = strtolower(trim((string)($body['error'] ?? '')));
        $message = trim((string)($body['error_description'] ?? ($body['error_message'] ?? '')));
        $payload = $body !== [] ? $body : ['raw_body' => $response['raw_body']];

        return match ($error) {
            'invalid_grant' => $this->failure(
                'expired',
                'google.invalid_grant',
                $message !== '' ? $message : 'Google authorization code가 만료되었거나 이미 사용되었습니다.',
                true,
                true,
                $payload
            ),
            'access_denied' => $this->failure(
                'cancelled',
                'google.access_denied',
                $message !== '' ? $message : '사용자가 Google 인증을 취소했습니다.',
                true,
                true,
                $payload
            ),
            'interaction_required', 'login_required', 'consent_required' => $this->failure(
                'requires_user_action',
                'google.' . $error,
                $message !== '' ? $message : 'Google 인증에 추가 사용자 동작이 필요합니다.',
                true,
                true,
                $payload
            ),
            'temporarily_unavailable' => $this->failure(
                'failed',
                'google.temporarily_unavailable',
                $message !== '' ? $message : 'Google 인증 공급자가 일시적으로 응답하지 않습니다.',
                true,
                false,
                $payload
            ),
            default => $this->failure(
                'failed',
                $error !== '' ? 'google.' . $error : 'google.' . $stage . '.request_failed',
                $message !== '' ? $message : 'Google ' . $stage . ' 요청이 실패했습니다.',
                false,
                false,
                $payload
            ),
        };
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
    public function invalidTokenResponse(string $rawBody): array
    {
        return $this->failure(
            'failed',
            'google.token.invalid_response',
            'Google token 응답을 해석할 수 없습니다.',
            false,
            false,
            ['raw_body' => $rawBody]
        );
    }

    /**
     * @param array<string,mixed> $tokenBody
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
    public function missingAccessToken(array $tokenBody): array
    {
        return $this->failure(
            'failed',
            'google.token.access_token_missing',
            'Google token 응답에 access_token이 없습니다.',
            false,
            false,
            $this->failureBuilder->sanitizeTokenBody($tokenBody)
        );
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
    public function invalidUserinfoResponse(string $rawBody): array
    {
        return $this->failure(
            'failed',
            'google.userinfo.invalid_response',
            'Google userinfo 응답을 해석할 수 없습니다.',
            false,
            false,
            ['raw_body' => $rawBody]
        );
    }

    /**
     * @param array<string,mixed> $userInfo
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
    public function missingProviderUserId(array $userInfo): array
    {
        return $this->failure(
            'failed',
            'google.userinfo.sub_missing',
            'Google userinfo 응답에 sub가 없습니다.',
            false,
            false,
            $userInfo
        );
    }

    /**
     * @param array<string,mixed> $tokenBody
     * @param array<string,mixed> $userInfo
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
    public function success(string $requestToken, array $tokenBody, array $userInfo, string $userinfoEndpoint): array
    {
        return $this->successBuilder->build($requestToken, $tokenBody, $userInfo, $userinfoEndpoint);
    }

    /**
     * @param array<string,mixed> $payload
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
    private function failure(
        string $status,
        string $errorCode,
        string $message,
        bool $retryable,
        bool $userActionRequired,
        array $payload
    ): array {
        return $this->failureBuilder->build($status, $errorCode, $message, $retryable, $userActionRequired, $payload);
    }
}
