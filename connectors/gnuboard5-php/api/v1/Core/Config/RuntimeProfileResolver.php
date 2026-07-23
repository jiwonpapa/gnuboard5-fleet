<?php

declare(strict_types=1);

namespace Api\Core\Config;

final class RuntimeProfileResolver
{
    public static function resolve(?string $metadataPath = null): RuntimeProfile
    {
        $path = $metadataPath ?? self::defaultMetadataPath();

        $envMode = RuntimeMode::fromString(EnvValueReader::string('APP_RUNTIME_MODE', ''));
        $buildMode = RuntimeMode::fromString((string)(self::loadMetadata($path)['mode'] ?? ''));
        $debugMode = EnvValueReader::bool('API_DEBUG', false) ? RuntimeMode::Dev : null;
        $appEnvMode = self::fromAppEnv(EnvValueReader::string('APP_ENV', 'production'));

        $mode = $envMode ?? $buildMode ?? $debugMode ?? $appEnvMode;
        $source = match (true) {
            $envMode instanceof RuntimeMode => 'env.app_runtime_mode',
            $buildMode instanceof RuntimeMode => 'build.runtime_metadata',
            $debugMode instanceof RuntimeMode => 'env.api_debug',
            default => 'env.app_env',
        };

        $displayErrorDetails = $mode === RuntimeMode::Dev;

        return new RuntimeProfile(
            mode: $mode,
            displayErrorDetails: $displayErrorDetails,
            includeTraceInResponse: $displayErrorDetails && EnvValueReader::bool('DEBUG_RESPONSE_INCLUDE_TRACE', true),
            logRequestPayload: EnvValueReader::bool('LOG_ERROR_PAYLOAD', true),
            traceLimit: max(5, EnvValueReader::int('DEBUG_TRACE_LIMIT', $displayErrorDetails ? 20 : 8)),
            source: $source
        );
    }

    public static function defaultMetadataPath(): string
    {
        return dirname(__DIR__, 4) . '/build/runtime/runtime.json';
    }

    private static function fromAppEnv(string $appEnv): RuntimeMode
    {
        return strtolower(trim($appEnv)) === 'local' ? RuntimeMode::Dev : RuntimeMode::Prod;
    }

    /**
     * @return array<string, mixed>
     */
    private static function loadMetadata(string $path): array
    {
        if (!is_file($path) || !is_readable($path)) {
            return [];
        }

        $decoded = json_decode((string)file_get_contents($path), true);

        return is_array($decoded) ? $decoded : [];
    }
}
