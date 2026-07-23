<?php

declare(strict_types=1);

namespace Api\Auth\Repository;

use Api\Auth\Support\AuthInputNormalizer;

trait AuthRepositoryInputSupport
{
    protected function toBooleanFlag(mixed $value): int
    {
        return $this->inputNormalizer()->toBoolFlag($value);
    }

    protected function sanitizeSingleLine(string $value): string
    {
        return $this->inputNormalizer()->sanitizeSingleLine($value);
    }

    protected function sanitizeMultiline(string $value): string
    {
        return $this->inputNormalizer()->sanitizeMultiline($value);
    }

    protected function normalizeMemberId(string $memberId): string
    {
        return $this->inputNormalizer()->sanitizeMemberId($memberId);
    }

    protected function isValidMemberId(string $memberId): bool
    {
        return $this->inputNormalizer()->isValidMemberId($memberId);
    }

    protected function sanitizeIp(string $value): string
    {
        return $this->inputNormalizer()->sanitizeIp($value);
    }

    protected function normalizePhone(string $value): string
    {
        return $this->inputNormalizer()->normalizePhone($value);
    }

    protected function normalizeBirth(string $value): string
    {
        return $this->inputNormalizer()->normalizeBirth($value);
    }

    protected function normalizeSex(string $value): string
    {
        return $this->inputNormalizer()->normalizeSex($value);
    }

    protected function normalizeCertify(string $value): string
    {
        return $this->inputNormalizer()->normalizeCertify($value);
    }

    /**
     * @return array{0:string,1:string}
     */
    protected function splitZip(string $rawZip): array
    {
        return $this->inputNormalizer()->splitZip($rawZip);
    }

    protected function normalizeZipSegment(string $value): string
    {
        return $this->inputNormalizer()->normalizeZipSegment($value);
    }

    protected function normalizeJibeon(string $value): string
    {
        return $this->inputNormalizer()->normalizeJibeon($value);
    }

    protected function normalizeIp(string $ipAddress): string
    {
        $ip = $this->sanitizeIp($ipAddress);
        if ($ip === '') {
            return mb_substr($this->envConfig()->unknownIpFallback, 0, 100);
        }

        return mb_substr($ip, 0, 100);
    }

    private function inputNormalizer(): AuthInputNormalizer
    {
        if ($this->resolvedInputNormalizer instanceof AuthInputNormalizer) {
            return $this->resolvedInputNormalizer;
        }

        $this->resolvedInputNormalizer = new AuthInputNormalizer();

        return $this->resolvedInputNormalizer;
    }
}
