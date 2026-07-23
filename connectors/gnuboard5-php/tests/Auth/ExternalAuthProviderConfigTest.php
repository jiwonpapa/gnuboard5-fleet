<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Auth\External\Support\ExternalAuthProviderConfig;
use PHPUnit\Framework\TestCase;

final class ExternalAuthProviderConfigTest extends TestCase
{
    /** @var array<string, string|false> */
    private array $envBackup = [];

    protected function setUp(): void
    {
        parent::setUp();

        foreach ($this->managedEnvKeys() as $key) {
            $this->envBackup[$key] = getenv($key);
            putenv($key);
            unset($_ENV[$key]);
        }
    }

    protected function tearDown(): void
    {
        foreach ($this->managedEnvKeys() as $key) {
            $previous = $this->envBackup[$key] ?? false;
            if ($previous === false) {
                putenv($key);
                unset($_ENV[$key]);
                continue;
            }

            putenv($key . '=' . $previous);
            $_ENV[$key] = (string)$previous;
        }

        parent::tearDown();
    }

    public function testFromEnvReadsProviderOverrides(): void
    {
        putenv('AUTH_EXTERNAL_GOOGLE_ENABLED=false');
        $_ENV['AUTH_EXTERNAL_GOOGLE_ENABLED'] = 'false';
        putenv('AUTH_EXTERNAL_GOOGLE_TOKEN_URL=https://example.com/google/token');
        $_ENV['AUTH_EXTERNAL_GOOGLE_TOKEN_URL'] = 'https://example.com/google/token';

        $config = ExternalAuthProviderConfig::fromEnv();

        self::assertFalse($config->providerEnabled('google', true));
        self::assertSame(
            'https://example.com/google/token',
            $config->providerString('google', 'token_url', 'https://fallback.test/token')
        );
    }

    public function testProviderHelpersFallbackWhenOverrideMissing(): void
    {
        $config = new ExternalAuthProviderConfig();

        self::assertTrue($config->providerEnabled('kakao', true));
        self::assertSame(
            'https://fallback.test/userinfo',
            $config->providerString('kakao', 'userinfo_url', 'https://fallback.test/userinfo')
        );
    }

    /**
     * @return list<string>
     */
    private function managedEnvKeys(): array
    {
        return [
            'AUTH_EXTERNAL_GOOGLE_ENABLED',
            'AUTH_EXTERNAL_GOOGLE_TOKEN_URL',
        ];
    }
}
