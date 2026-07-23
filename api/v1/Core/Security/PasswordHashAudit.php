<?php

/**
 * PasswordHashAudit API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Security
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Security;

final class PasswordHashAudit
{
    public const FORMAT_EMPTY = 'empty';
    public const FORMAT_CREATE_HASH = 'create_hash';
    public const FORMAT_MYSQL41 = 'mysql41';
    public const FORMAT_MYSQL323 = 'mysql323';
    public const FORMAT_BCRYPT = 'bcrypt';
    public const FORMAT_ARGON2 = 'argon2';
    public const FORMAT_MD5 = 'md5';
    public const FORMAT_SHA1_HEX = 'sha1_hex';
    public const FORMAT_SHA256_HEX = 'sha256_hex';
    public const FORMAT_OTHER = 'other';

    public function classify(string $hash): string
    {
        $normalized = trim($hash);
        if ($normalized === '') {
            return self::FORMAT_EMPTY;
        }

        if (preg_match('/^[a-z0-9]+:\d+:[^:]+:[A-Za-z0-9+\/=]+$/i', $normalized) === 1) {
            return self::FORMAT_CREATE_HASH;
        }

        if (preg_match('/^\*[A-F0-9]{40}$/', $normalized) === 1) {
            return self::FORMAT_MYSQL41;
        }

        if (preg_match('/^[A-F0-9]{16}$/', $normalized) === 1) {
            return self::FORMAT_MYSQL323;
        }

        if (preg_match('/^\$2[aby]\$/', $normalized) === 1) {
            return self::FORMAT_BCRYPT;
        }

        if (str_starts_with($normalized, '$argon2')) {
            return self::FORMAT_ARGON2;
        }

        if (preg_match('/^[a-f0-9]{64}$/i', $normalized) === 1) {
            return self::FORMAT_SHA256_HEX;
        }

        if (preg_match('/^[a-f0-9]{40}$/i', $normalized) === 1) {
            return self::FORMAT_SHA1_HEX;
        }

        if (preg_match('/^[a-f0-9]{32}$/i', $normalized) === 1) {
            return self::FORMAT_MD5;
        }

        return self::FORMAT_OTHER;
    }

    public function isCompatibleWithEncryptFunc(string $format, string $encryptFunc): bool
    {
        $normalizedFunc = strtolower(trim($encryptFunc));

        return match ($normalizedFunc) {
            'create_hash' => in_array($format, [
                self::FORMAT_CREATE_HASH,
                self::FORMAT_MYSQL41,
                self::FORMAT_MYSQL323,
            ], true),
            'sql_password' => in_array($format, [
                self::FORMAT_MYSQL41,
                self::FORMAT_MYSQL323,
            ], true),
            default => false,
        };
    }

    /**
     * @param iterable<array{mb_id?: mixed, mb_password?: mixed}> $rows
     * @return array{
     *   encrypt_func: string,
     *   total: int,
     *   compatible_count: int,
     *   incompatible_count: int,
     *   formats: array<string, int>,
     *   incompatible_samples: list<array{mb_id_masked: string, format: string, length: int, prefix: string}>
     * }
     */
    public function summarize(iterable $rows, string $encryptFunc, int $sampleLimit = 5): array
    {
        $formats = [];
        $compatibleCount = 0;
        $incompatibleCount = 0;
        $samples = [];
        $total = 0;

        foreach ($rows as $row) {
            $total++;
            $memberId = trim((string)($row['mb_id'] ?? ''));
            $hash = trim((string)($row['mb_password'] ?? ''));
            $format = $this->classify($hash);
            $formats[$format] = ($formats[$format] ?? 0) + 1;

            if ($this->isCompatibleWithEncryptFunc($format, $encryptFunc)) {
                $compatibleCount++;
                continue;
            }

            $incompatibleCount++;
            if (count($samples) < $sampleLimit) {
                $samples[] = [
                    'mb_id_masked' => $this->maskMemberId($memberId),
                    'format' => $format,
                    'length' => strlen($hash),
                    'prefix' => substr($hash, 0, 12),
                ];
            }
        }

        ksort($formats);

        return [
            'encrypt_func' => strtolower(trim($encryptFunc)),
            'total' => $total,
            'compatible_count' => $compatibleCount,
            'incompatible_count' => $incompatibleCount,
            'formats' => $formats,
            'incompatible_samples' => $samples,
        ];
    }

    private function maskMemberId(string $memberId): string
    {
        if ($memberId === '') {
            return '***';
        }

        if (strlen($memberId) <= 3) {
            return $memberId . '***';
        }

        return substr($memberId, 0, 3) . '***';
    }
}
