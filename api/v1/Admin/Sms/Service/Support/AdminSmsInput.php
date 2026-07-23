<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Service\Support;

use Api\Support\Exception\ApiException;

final class AdminSmsInput
{
    /**
     * @param array<string,mixed> $payload
     * @param list<string> $allowed
     */
    public static function assertAllowedKeys(array $payload, array $allowed, string $context = '요청 본문'): void
    {
        $unknown = array_values(array_diff(array_keys($payload), $allowed));
        if ($unknown !== []) {
            throw ApiException::badRequest($context . '에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown));
        }
    }

    /**
     * @param array<string,mixed> $query
     * @return array{0:int,1:int}
     */
    public static function pagination(array $query): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(100, max(1, (int)($query['per_page'] ?? 20)));

        return [$page, $perPage];
    }

    /**
     * @return array<string,mixed>
     */
    public static function buildPagination(int $page, int $perPage, int $total): array
    {
        $lastPage = max(1, (int)ceil($total / $perPage));

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => $lastPage,
            'has_next' => $page < $lastPage,
            'has_prev' => $page > 1,
        ];
    }

    /**
     * @param mixed $value
     * @return list<int>
     */
    public static function normalizeIntList(mixed $value, string $field): array
    {
        if (!is_array($value)) {
            throw ApiException::badRequest($field . '는 배열이어야 합니다.');
        }

        $items = [];
        foreach ($value as $item) {
            if (!is_numeric($item)) {
                throw ApiException::badRequest($field . '에는 정수만 포함할 수 있습니다.');
            }

            $intValue = (int)$item;
            if ($intValue <= 0) {
                throw ApiException::badRequest($field . '에는 1 이상의 정수만 포함할 수 있습니다.');
            }

            $items[] = $intValue;
        }

        return array_values(array_unique($items));
    }

    /**
     * @param list<string> $allowed
     */
    public static function normalizeEnum(string $value, array $allowed, string $field): string
    {
        $normalized = trim($value);
        if (!in_array($normalized, $allowed, true)) {
            throw ApiException::badRequest($field . ' 값이 올바르지 않습니다.');
        }

        return $normalized;
    }

    public static function assertPositiveInt(int $value, string $field): void
    {
        if ($value <= 0) {
            throw ApiException::badRequest($field . '는 1 이상의 정수여야 합니다.');
        }
    }

    public static function assertNonNegativeInt(int $value, string $field): void
    {
        if ($value < 0) {
            throw ApiException::badRequest($field . '는 0 이상의 정수여야 합니다.');
        }
    }

    public static function nullablePositiveInt(mixed $value, string $field): ?int
    {
        if ($value === null || trim((string)$value) === '') {
            return null;
        }
        if (!is_numeric($value)) {
            throw ApiException::badRequest($field . '는 정수여야 합니다.');
        }

        $intValue = (int)$value;
        if ($intValue <= 0) {
            throw ApiException::badRequest($field . '는 1 이상의 정수여야 합니다.');
        }

        return $intValue;
    }

    public static function nullableNonNegativeInt(mixed $value, string $field): ?int
    {
        if ($value === null || trim((string)$value) === '') {
            return null;
        }
        if (!is_numeric($value)) {
            throw ApiException::badRequest($field . '는 정수여야 합니다.');
        }

        $intValue = (int)$value;
        if ($intValue < 0) {
            throw ApiException::badRequest($field . '는 0 이상의 정수여야 합니다.');
        }

        return $intValue;
    }

    public static function normalizeMobilePhone(string $phone, string $field = 'bk_hp'): string
    {
        $digits = preg_replace('/[^0-9]/', '', trim($phone)) ?? '';
        if (preg_match('/^(01[016789])([0-9]{3,4})([0-9]{4})$/', $digits) !== 1) {
            throw ApiException::badRequest($field . '는 유효한 휴대폰번호여야 합니다.');
        }

        return $digits;
    }

    public static function isValidCallbackPhone(string $phone): bool
    {
        $digits = preg_replace('/[^0-9]/', '', trim($phone)) ?? '';
        if ($digits === '') {
            return false;
        }

        if (str_starts_with($digits, '1588') && strlen($digits) !== 8) {
            return false;
        }
        if (str_starts_with($digits, '02') && !in_array(strlen($digits), [9, 10], true)) {
            return false;
        }
        if (str_starts_with($digits, '030') && !in_array(strlen($digits), [10, 11], true)) {
            return false;
        }

        if (
            preg_match('/^(02|0[3-6]\d|01(0|1|3|5|6|7|8|9)|070|080|007)\d{7,9}$/', $digits) !== 1
            && preg_match('/^(15|16|18)\d{6,7}$/', $digits) !== 1
        ) {
            return false;
        }

        return preg_match('/^(02|0[3-6]\d|01(0|1|3|5|6|7|8|9)|070|080)0{3,4}\d{4}$/', $digits) !== 1;
    }

    public static function boolToInt(mixed $value): int
    {
        return self::toBool($value) ? 1 : 0;
    }

    public static function toBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value)) {
            return $value === 1;
        }

        $normalized = strtolower(trim((string)$value));

        return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
    }

    public static function normalizeBookingAt(mixed $value): ?string
    {
        $raw = trim((string)$value);
        if ($raw === '') {
            return null;
        }

        try {
            $date = new \DateTimeImmutable($raw);
        } catch (\Throwable) {
            throw ApiException::badRequest('booking_at은 유효한 날짜/시간이어야 합니다.');
        }

        return $date->format('Y-m-d H:i:00');
    }
}
