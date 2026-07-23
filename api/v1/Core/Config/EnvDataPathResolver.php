<?php

declare(strict_types=1);

namespace Api\Core\Config;

final class EnvDataPathResolver
{
    public static function resolve(): string
    {
        $dataPath = EnvValueReader::raw('DATA_PATH');
        $legacyPath = EnvValueReader::raw('UPLOAD_ROOT_PATH');

        $candidates = [];
        if ($dataPath !== '') {
            $candidates[] = rtrim($dataPath, '/');
        }
        if ($legacyPath !== '') {
            $candidates[] = rtrim($legacyPath, '/');
        }
        $candidates[] = self::defaultDataPath();

        foreach (array_values(array_unique($candidates)) as $candidate) {
            if ($candidate === '') {
                continue;
            }

            if (is_dir($candidate)) {
                return $candidate;
            }

            $parent = dirname($candidate);
            if ($parent !== '' && is_dir($parent) && is_writable($parent)) {
                return $candidate;
            }
        }

        return self::defaultDataPath();
    }

    public static function defaultDataPath(): string
    {
        return dirname(__DIR__, 4) . '/data';
    }
}
