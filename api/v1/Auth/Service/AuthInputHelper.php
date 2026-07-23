<?php

/**
 * AuthInputHelper API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Service;

use Api\Auth\Support\AuthInputNormalizer;

final class AuthInputHelper
{
    private ?AuthInputNormalizer $resolvedNormalizer = null;

    public function __construct(?AuthInputNormalizer $normalizer = null)
    {
        $this->resolvedNormalizer = $normalizer;
    }

    public function sanitizeMemberId(string $value): string
    {
        return $this->normalizer()->sanitizeMemberId($value);
    }

    public function isValidMemberId(string $value): bool
    {
        return $this->normalizer()->isValidMemberId($value);
    }

    public function sanitizeSingleLine(string $value): string
    {
        return $this->normalizer()->sanitizeSingleLine($value);
    }

    public function sanitizeMultiline(string $value): string
    {
        return $this->normalizer()->sanitizeMultiline($value);
    }

    public function normalizePhone(string $value): string
    {
        return $this->normalizer()->normalizePhone($value);
    }

    public function toBoolFlag(mixed $value): int
    {
        return $this->normalizer()->toBoolFlag($value);
    }

    /**
     * @return array{0:string,1:string}
     */
    public function splitZip(string $value): array
    {
        return $this->normalizer()->splitZip($value);
    }

    public function normalizeJibeon(string $value): string
    {
        return $this->normalizer()->normalizeJibeon($value);
    }

    private function normalizer(): AuthInputNormalizer
    {
        if ($this->resolvedNormalizer instanceof AuthInputNormalizer) {
            return $this->resolvedNormalizer;
        }

        $this->resolvedNormalizer = new AuthInputNormalizer();

        return $this->resolvedNormalizer;
    }
}
