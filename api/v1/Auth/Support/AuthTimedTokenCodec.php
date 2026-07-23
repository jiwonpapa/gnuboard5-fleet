<?php

declare(strict_types=1);

namespace Api\Auth\Support;

final class AuthTimedTokenCodec
{
    public function encode(string $token, int $expiresAt): string
    {
        return $token . '|' . max(0, $expiresAt);
    }

    /**
     * @return array{token:string, expires_at:int}
     */
    public function decode(string $stored): array
    {
        $normalized = trim($stored);
        if ($normalized === '') {
            return ['token' => '', 'expires_at' => 0];
        }

        $parts = explode('|', $normalized, 2);
        if (count($parts) === 2 && preg_match('/^\d+$/', $parts[1]) === 1) {
            return [
                'token' => trim($parts[0]),
                'expires_at' => (int) $parts[1],
            ];
        }

        return ['token' => $normalized, 'expires_at' => 0];
    }
}
