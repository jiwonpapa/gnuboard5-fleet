<?php

declare(strict_types=1);

namespace Api\Auth\Service\Support;

use Api\Support\Exception\ApiException;

final class AuthSessionRequestNormalizer
{
    /** @param array<string,mixed> $payload @return array{mb_id:string,mb_password:string} */
    public function login(array $payload): array
    {
        $this->assertAllowedFields($payload, ['mb_id', 'mb_password'], '로그인');

        return [
            'mb_id' => $this->requiredString($payload['mb_id'] ?? null, 'mb_id'),
            'mb_password' => $this->requiredString($payload['mb_password'] ?? null, 'mb_password', false),
        ];
    }

    /** @param array<string,mixed> $payload */
    public function refresh(array $payload): string
    {
        $this->assertAllowedFields($payload, ['refresh_token'], '토큰 갱신');

        return $this->requiredString($payload['refresh_token'] ?? null, 'refresh_token');
    }

    /** @param array<string,mixed> $payload */
    public function logout(array $payload): ?string
    {
        $this->assertAllowedFields($payload, ['refresh_token'], '로그아웃');
        if (!array_key_exists('refresh_token', $payload) || $payload['refresh_token'] === null) {
            return null;
        }

        return $this->requiredString($payload['refresh_token'], 'refresh_token');
    }

    /** @param array<string,mixed> $payload @param list<string> $allowed */
    private function assertAllowedFields(array $payload, array $allowed, string $context): void
    {
        $unknown = array_values(array_diff(array_keys($payload), $allowed));
        if ($unknown !== []) {
            throw ApiException::badRequest(
                $context . ' 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown)
            );
        }
    }

    private function requiredString(mixed $value, string $field, bool $trim = true): string
    {
        if (!is_string($value)) {
            throw ApiException::badRequest($field . '는 문자열이어야 합니다.');
        }

        $normalized = $trim ? trim($value) : $value;
        if ($normalized === '') {
            throw ApiException::badRequest($field . '가 필요합니다.');
        }

        return $normalized;
    }
}
