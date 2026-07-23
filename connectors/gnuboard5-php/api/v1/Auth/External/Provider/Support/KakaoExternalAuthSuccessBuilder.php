<?php

declare(strict_types=1);

namespace Api\Auth\External\Provider\Support;

final readonly class KakaoExternalAuthSuccessBuilder
{
    public function __construct(
        private string $providerMode,
        private KakaoExternalAuthFailureBuilder $failureBuilder
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
        $providerUserId = trim((string)($userInfo['id'] ?? ''));
        if ($providerUserId === '') {
            return $this->failureBuilder->build(
                'failed',
                'kakao.userinfo.id_missing',
                'Kakao userinfo 응답에 id가 없습니다.',
                false,
                false,
                $userInfo
            );
        }

        $kakaoAccount = is_array($userInfo['kakao_account'] ?? null) ? $userInfo['kakao_account'] : [];
        $profile = is_array($kakaoAccount['profile'] ?? null) ? $kakaoAccount['profile'] : [];
        $properties = is_array($userInfo['properties'] ?? null) ? $userInfo['properties'] : [];

        $providerUser = [
            'provider_user_id' => $providerUserId,
            'email' => strtolower(trim((string)($kakaoAccount['email'] ?? ''))),
            'display_name' => trim((string)($profile['nickname'] ?? ($properties['nickname'] ?? ''))),
            'picture' => trim((string)($profile['profile_image_url'] ?? ($properties['profile_image'] ?? ''))),
            'email_verified' => (bool)($kakaoAccount['is_email_verified'] ?? false)
                && (bool)($kakaoAccount['is_email_valid'] ?? false),
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
