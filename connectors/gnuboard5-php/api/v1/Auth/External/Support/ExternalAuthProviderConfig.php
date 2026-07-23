<?php

declare(strict_types=1);

namespace Api\Auth\External\Support;

use Api\Core\Config\EnvValueReader;

final readonly class ExternalAuthProviderConfig
{
    /**
     * @param array<string,array<string,mixed>> $providers
     */
    public function __construct(
        public array $providers = []
    ) {
    }

    public static function fromEnv(): self
    {
        return new self([
            'google' => self::providerFromEnv('AUTH_EXTERNAL_GOOGLE_'),
            'kakao' => self::providerFromEnv('AUTH_EXTERNAL_KAKAO_'),
        ]);
    }

    public function providerEnabled(string $provider, bool $default = true): bool
    {
        $settings = $this->providers[$provider] ?? [];
        $value = $settings['enabled'] ?? null;

        return is_bool($value) ? $value : $default;
    }

    public function providerString(string $provider, string $key, string $default = ''): string
    {
        $settings = $this->providers[$provider] ?? [];
        $value = $settings[$key] ?? null;
        if (!is_string($value)) {
            return trim($default);
        }

        $normalized = trim($value);

        return $normalized === '' ? trim($default) : $normalized;
    }

    /**
     * @return array<string,mixed>
     */
    private static function providerFromEnv(string $prefix): array
    {
        return [
            'enabled' => EnvValueReader::optionalBool($prefix . 'ENABLED'),
            'client_id' => EnvValueReader::string($prefix . 'CLIENT_ID', ''),
            'client_secret' => EnvValueReader::string($prefix . 'CLIENT_SECRET', ''),
            'authorize_url' => EnvValueReader::string($prefix . 'AUTHORIZE_URL', ''),
            'token_url' => EnvValueReader::string($prefix . 'TOKEN_URL', ''),
            'userinfo_url' => EnvValueReader::string($prefix . 'USERINFO_URL', ''),
        ];
    }
}
