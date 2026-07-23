<?php

/**
 * EnvLoader API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Config
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Config;

final class EnvLoader
{
    /** @var list<string> */
    private const OVERRIDE_ENV_KEYS = ['APP_ENV_FILE', 'API_ENV_FILE'];

    public static function resolvePath(?string $projectRoot = null): string
    {
        foreach (self::OVERRIDE_ENV_KEYS as $key) {
            $resolved = EnvValueReader::raw($key);
            if ($resolved !== '') {
                return $resolved;
            }
        }

        $root = $projectRoot ?? dirname(__DIR__, 4);

        return rtrim($root, '/') . '/.env';
    }

    /**
     * @return array<string, string>
     */
    public static function load(string $envPath): array
    {
        if (!is_file($envPath) || !is_readable($envPath)) {
            return [];
        }

        $lines = file($envPath, FILE_IGNORE_NEW_LINES);
        if (!is_array($lines)) {
            return [];
        }

        $values = [];
        foreach ($lines as $line) {
            $parsed = self::parseLine((string)$line);
            if ($parsed === null) {
                continue;
            }

            [$key, $value] = $parsed;
            $values[$key] = $value;
            $_ENV[$key] = $value;
            putenv($key . '=' . $value);
        }

        return $values;
    }

    /**
     * @return array{0: string, 1: string}|null
     */
    public static function parseLine(string $line): ?array
    {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#')) {
            return null;
        }

        if (str_starts_with($trimmed, 'export ')) {
            $trimmed = trim(substr($trimmed, 7));
        }

        $position = strpos($trimmed, '=');
        if ($position === false) {
            return null;
        }

        $key = trim(substr($trimmed, 0, $position));
        if ($key === '' || preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $key) !== 1) {
            return null;
        }

        $rawValue = trim(substr($trimmed, $position + 1));
        $value = self::normalizeValue($rawValue);

        return [$key, $value];
    }

    private static function normalizeValue(string $rawValue): string
    {
        if ($rawValue === '') {
            return '';
        }

        $firstChar = $rawValue[0];
        if (($firstChar === '"' || $firstChar === "'") && str_ends_with($rawValue, $firstChar) && strlen($rawValue) >= 2) {
            $quoted = substr($rawValue, 1, -1);
            if ($firstChar === '"') {
                $quoted = str_replace(['\\"', '\\n', '\\r', '\\t'], ['"', "\n", "\r", "\t"], $quoted);
            }

            return $quoted;
        }

        $commentPosition = strpos($rawValue, ' #');
        if ($commentPosition !== false) {
            $rawValue = substr($rawValue, 0, $commentPosition);
        }

        return trim($rawValue);
    }
}
