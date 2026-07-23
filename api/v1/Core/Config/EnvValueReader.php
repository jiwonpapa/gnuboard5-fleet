<?php

declare(strict_types=1);

namespace Api\Core\Config;

final class EnvValueReader
{
    public static function string(string $key, string $default = ''): string
    {
        $value = $_ENV[$key] ?? getenv($key);
        if ($value === false) {
            return trim($default);
        }

        $normalized = trim((string)$value);

        return $normalized === '' ? trim($default) : $normalized;
    }

    public static function raw(string $key): string
    {
        $value = $_ENV[$key] ?? getenv($key);

        return trim((string)($value === false ? '' : $value));
    }

    public static function stringUntrimmed(string $key, string $default = ''): string
    {
        if (array_key_exists($key, $_ENV)) {
            $value = $_ENV[$key];

            return is_string($value) ? $value : (string)$default;
        }

        $value = getenv($key);
        if ($value === false) {
            return $default;
        }

        return is_string($value) ? $value : (string)$default;
    }

    public static function int(string $key, int $default): int
    {
        $value = self::raw($key);
        if ($value === '' || !is_numeric($value)) {
            return $default;
        }

        return (int)$value;
    }

    public static function bool(string $key, bool $default): bool
    {
        $value = self::raw($key);
        if ($value === '') {
            return $default;
        }

        $parsed = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

        return $parsed ?? $default;
    }

    public static function optionalBool(string $key): ?bool
    {
        $value = self::raw($key);
        if ($value === '') {
            return null;
        }

        $parsed = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

        return is_bool($parsed) ? $parsed : null;
    }
}
