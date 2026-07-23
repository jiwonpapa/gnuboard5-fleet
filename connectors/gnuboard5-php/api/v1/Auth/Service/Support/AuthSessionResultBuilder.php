<?php

/**
 * AuthSessionResultBuilder API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Service\Support
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Service\Support;

final class AuthSessionResultBuilder
{
    /**
     * @param array<string,mixed> $tokens
     * @return array{access_token:string,refresh_token:string,expires_in:int}
     */
    public function tokenPair(array $tokens): array
    {
        return [
            'access_token' => (string)($tokens['access_token'] ?? ''),
            'refresh_token' => (string)($tokens['refresh_token'] ?? ''),
            'expires_in' => (int)($tokens['expires_in'] ?? 0),
        ];
    }

    /**
     * @return array{revoked:array{access:bool,refresh:bool},logged_out:bool}
     */
    public function logout(bool $accessRevoked, bool $refreshRevoked): array
    {
        return [
            'revoked' => [
                'access' => $accessRevoked,
                'refresh' => $refreshRevoked,
            ],
            'logged_out' => true,
        ];
    }
}
