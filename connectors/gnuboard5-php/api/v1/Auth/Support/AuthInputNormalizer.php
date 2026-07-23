<?php

declare(strict_types=1);

namespace Api\Auth\Support;

use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;

final class AuthInputNormalizer
{
    public function sanitizeMemberId(string $value): string
    {
        return $this->sanitizeSingleLine($value);
    }

    public function isValidMemberId(string $value): bool
    {
        $normalized = $this->sanitizeMemberId($value);
        if ($normalized === '') {
            return false;
        }

        return preg_match(ValidationPatterns::MEMBER_ID, $normalized) === 1;
    }

    public function sanitizeSingleLine(string $value): string
    {
        $normalized = str_replace("\0", '', $value);
        $normalized = strip_tags($normalized);

        return trim($normalized);
    }

    public function sanitizeMultiline(string $value): string
    {
        $normalized = str_replace("\0", '', $value);
        $normalized = strip_tags($normalized);

        return trim($normalized);
    }

    public function sanitizeIp(string $value): string
    {
        $normalized = str_replace(["\0", "\r", "\n"], '', $value);

        return trim($normalized);
    }

    public function normalizePhone(string $value): string
    {
        $digits = preg_replace('/[^0-9]/', '', $this->sanitizeSingleLine($value));
        if (!is_string($digits)) {
            return '';
        }

        return $digits;
    }

    public function toBoolFlag(mixed $value): int
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if (is_int($value) || is_float($value)) {
            return ((int) $value) > 0 ? 1 : 0;
        }

        $normalized = strtolower(trim((string) $value));
        if ($normalized === '' || in_array($normalized, ['0', 'false', 'off', 'no', 'n'], true)) {
            return 0;
        }

        return in_array($normalized, ['1', 'true', 'on', 'yes', 'y'], true) ? 1 : 0;
    }

    public function normalizeBirth(string $value): string
    {
        $digits = preg_replace('/[^0-9]/', '', $this->sanitizeSingleLine($value));
        if (!is_string($digits) || $digits === '') {
            return '';
        }
        if (strlen($digits) !== 8) {
            throw ApiException::badRequest('생년월일은 YYYYMMDD 8자리여야 합니다.');
        }

        return $digits;
    }

    public function normalizeSex(string $value): string
    {
        $normalized = strtoupper($this->sanitizeSingleLine($value));
        if ($normalized === '') {
            return '';
        }
        if (!in_array($normalized, ['M', 'F'], true)) {
            throw ApiException::badRequest('성별은 M/F 중 하나여야 합니다.');
        }

        return $normalized;
    }

    public function normalizeCertify(string $value): string
    {
        $normalized = strtolower($this->sanitizeSingleLine($value));
        if ($normalized === '') {
            return '';
        }
        if (!in_array($normalized, ['hp', 'ipin', ''], true)) {
            throw ApiException::badRequest('본인확인 수단은 hp/ipin 중 하나여야 합니다.');
        }

        return $normalized;
    }

    /**
     * @return array{0:string,1:string}
     */
    public function splitZip(string $value): array
    {
        $digits = preg_replace('/[^0-9]/', '', $this->sanitizeSingleLine($value));
        if (!is_string($digits) || $digits === '') {
            return ['', ''];
        }

        if (strlen($digits) <= 3) {
            return [substr($digits, 0, 3), ''];
        }

        return [
            substr($digits, 0, 3),
            substr($digits, 3, 3),
        ];
    }

    public function normalizeZipSegment(string $value): string
    {
        $digits = preg_replace('/[^0-9]/', '', $this->sanitizeSingleLine($value));
        if (!is_string($digits)) {
            return '';
        }

        return substr($digits, 0, 3);
    }

    public function normalizeJibeon(string $value): string
    {
        $normalized = strtoupper($this->sanitizeSingleLine($value));

        return in_array($normalized, ['N', 'R'], true) ? $normalized : '';
    }
}
