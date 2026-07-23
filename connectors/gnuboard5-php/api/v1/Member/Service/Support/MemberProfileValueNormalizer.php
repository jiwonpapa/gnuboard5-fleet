<?php

declare(strict_types=1);

namespace Api\Member\Service\Support;

final class MemberProfileValueNormalizer
{
    /**
     * @return array{mb_zip1:string,mb_zip2:string}
     */
    public function normalizeZipUpdate(string $value): array
    {
        [$zip1, $zip2] = $this->splitZip(trim($value));

        return [
            'mb_zip1' => $zip1,
            'mb_zip2' => $zip2,
        ];
    }

    /**
     * @return array{0:string,1:string}
     */
    public function splitZip(string $rawZip): array
    {
        $digits = preg_replace('/[^0-9]/', '', $rawZip) ?? '';
        if ($digits === '') {
            return ['', ''];
        }

        if (strlen($digits) <= 3) {
            return [$this->normalizeZipSegment($digits), ''];
        }

        return [
            $this->normalizeZipSegment(substr($digits, 0, 3)),
            $this->normalizeZipSegment(substr($digits, 3, 3)),
        ];
    }

    public function normalizeZipSegment(string $value): string
    {
        $digits = preg_replace('/[^0-9]/', '', $value) ?? '';

        return substr($digits, 0, 3);
    }

    public function normalizeBoolFlag(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        if (is_int($value) || is_float($value)) {
            return ((int)$value) > 0 ? '1' : '0';
        }

        $normalized = strtolower(trim((string)$value));
        if ($normalized === '' || in_array($normalized, ['0', 'false', 'off', 'no', 'n'], true)) {
            return '0';
        }

        return in_array($normalized, ['1', 'true', 'on', 'yes', 'y'], true) ? '1' : '0';
    }

    public function sanitizeSingleLine(string $value): string
    {
        $normalized = str_replace("\0", '', $value);
        $normalized = strip_tags($normalized);

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

    public function normalizeJibeon(string $value): string
    {
        $normalized = strtoupper($this->sanitizeSingleLine($value));

        return in_array($normalized, ['N', 'R'], true) ? $normalized : '';
    }

    public function sanitizeMultiline(string $value): string
    {
        $normalized = str_replace("\0", '', $value);
        $normalized = strip_tags($normalized);

        return trim($normalized);
    }
}
