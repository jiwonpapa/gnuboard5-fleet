<?php

declare(strict_types=1);

namespace Api\Auth\Service\Support;

use Api\Core\Config\EnvConfig;

final class AuthRecoveryResponseBuilder
{
    public function __construct(
        private readonly EnvConfig $envConfig
    ) {
    }

    /**
     * @return array{accepted:bool,reset_token?:string}
     */
    public function buildPasswordResetAcceptedResponse(?string $issuedToken = null): array
    {
        $result = ['accepted' => true];
        if (!$this->envConfig->authExposeSensitiveTokens) {
            return $result;
        }

        $result['reset_token'] = $issuedToken ?? bin2hex(random_bytes(32));

        return $result;
    }

    /**
     * @return array{accepted:bool,verify_token?:string,mb_id?:string}
     */
    public function buildEmailVerificationAcceptedResponse(?string $memberId = null, ?string $issuedToken = null): array
    {
        $result = ['accepted' => true];
        if (
            !$this->envConfig->authExposeSensitiveTokens
            || $memberId === null
            || $memberId === ''
            || $issuedToken === null
            || $issuedToken === ''
        ) {
            return $result;
        }

        $result['verify_token'] = $issuedToken;
        $result['mb_id'] = $memberId;

        return $result;
    }
}
