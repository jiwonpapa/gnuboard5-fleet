<?php

declare(strict_types=1);

namespace Api\Qa\Service\Support;

use Api\Support\Exception\ApiException;

final class QaScalarInput
{
    public function normalizeEmail(string $rawEmail, bool $required): string
    {
        $email = trim($rawEmail);
        if ($email === '') {
            if ($required) {
                throw ApiException::badRequest('이메일을 입력해주세요.');
            }

            return '';
        }

        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw ApiException::badRequest('유효한 이메일 형식이 아닙니다.');
        }

        return $email;
    }

    public function normalizePhone(string $rawPhone): string
    {
        $normalized = preg_replace('/[^0-9\-]/', '', $rawPhone);
        return is_string($normalized) ? $normalized : '';
    }

    public function toBoolInt(mixed $value): int
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if (is_int($value) || is_float($value)) {
            return ((int)$value) > 0 ? 1 : 0;
        }

        $normalized = strtolower(trim((string)$value));
        return in_array($normalized, ['1', 'true', 'on', 'yes', 'y'], true) ? 1 : 0;
    }

    public function normalizePositiveInt(mixed $value, string $field, int $default): int
    {
        if ($value === null || $value === '') {
            return $default;
        }

        $numeric = is_int($value) ? $value : (is_numeric($value) ? (int)$value : null);
        if ($numeric === null || $numeric <= 0) {
            throw ApiException::badRequest($field . '는 1 이상의 정수여야 합니다.');
        }

        return $numeric;
    }
}
