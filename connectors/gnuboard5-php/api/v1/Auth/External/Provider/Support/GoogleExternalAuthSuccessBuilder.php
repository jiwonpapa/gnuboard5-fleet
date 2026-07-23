<?php

declare(strict_types=1);

namespace Api\Auth\External\Provider\Support;

final readonly class GoogleExternalAuthSuccessBuilder
{
    public function __construct(
        private string $providerMode,
        private GoogleExternalAuthFailureBuilder $failureBuilder
    ) {
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
    public function build(string $requestToken, array $tokenBody, array $userInfo, string $userinfoEndpoint): array
    {
        $providerUserId = trim((string)($userInfo['sub'] ?? ''));
        if ($providerUserId === '') {
            return $this->failureBuilder->build(
                'failed',
                'google.userinfo.sub_missing',
                'Google userinfo 응답에 sub가 없습니다.',
                false,
                false,
                $userInfo
            );
        }

        $providerUser = [
            'provider_user_id' => $providerUserId,
            'email' => strtolower(trim((string)($userInfo['email'] ?? ''))),
            'display_name' => trim((string)($userInfo['name'] ?? '')),
            'picture' => trim((string)($userInfo['picture'] ?? '')),
            'email_verified' => (bool)($userInfo['email_verified'] ?? false),
        ];

        return [
            'status' => 'success',
            'provider_tx_id' => $this->failureBuilder->providerTxId($requestToken, $providerUserId),
            'retryable' => false,
            'user_action_required' => false,
            'error_code' => null,
            'error_message' => null,
            'provider_user' => $providerUser,
            'provider_payload' => [
                'token' => $this->failureBuilder->sanitizeTokenBody($tokenBody),
                'userinfo' => $userInfo,
            ],
            'provider_meta' => [
                'mode' => $this->providerMode,
                'userinfo_endpoint' => $userinfoEndpoint,
            ],
        ];
    }
}
