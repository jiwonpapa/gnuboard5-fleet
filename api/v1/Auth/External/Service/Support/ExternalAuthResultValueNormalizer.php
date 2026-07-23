<?php

declare(strict_types=1);

namespace Api\Auth\External\Service\Support;

use Api\Support\Exception\ApiException;

final readonly class ExternalAuthResultValueNormalizer
{
    public function normalizeStatus(string $status): string
    {
        $normalized = strtolower(trim($status));
        $supported = ['success', 'pending', 'cancelled', 'failed', 'expired', 'requires_user_action'];
        if (!in_array($normalized, $supported, true)) {
            throw ApiException::serverError('외부 인증 공급자 결과 상태가 올바르지 않습니다.');
        }

        return $normalized;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function normalizeOptionalArray(mixed $value): ?array
    {
        if ($value === null) {
            return null;
        }

        if (!is_array($value)) {
            throw ApiException::serverError('외부 인증 공급자 응답 형식이 올바르지 않습니다.');
        }

        return $value;
    }

    public function normalizeOptionalString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = trim((string)$value);

        return $normalized === '' ? null : $normalized;
    }
}
