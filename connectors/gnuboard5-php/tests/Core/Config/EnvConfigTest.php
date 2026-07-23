<?php

declare(strict_types=1);

namespace Tests\Core\Config;

use Api\Core\Config\EnvConfig;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

final class EnvConfigTest extends TestCase
{
    /** @var array<string, string|null> */
    private array $envBackup = [];

    protected function tearDown(): void
    {
        foreach ($this->envBackup as $key => $value) {
            if ($value === null) {
                unset($_ENV[$key]);
                putenv($key);
                continue;
            }

            $_ENV[$key] = $value;
            putenv($key . '=' . $value);
        }

        $this->envBackup = [];
        parent::tearDown();
    }

    public function testFromEnvAcceptsSupportedEncryptFunction(): void
    {
        $this->setEnv('G5_ENCRYPT_FUNC', 'sql_password');

        $config = EnvConfig::fromEnv();

        self::assertSame('sql_password', $config->encryptFunc);
        self::assertSame(['create_hash', 'sql_password'], EnvConfig::supportedEncryptFuncs());
    }

    public function testFromEnvRejectsUnsupportedEncryptFunction(): void
    {
        $this->setEnv('G5_ENCRYPT_FUNC', 'sha256');

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('G5_ENCRYPT_FUNC');

        EnvConfig::fromEnv();
    }

    public function testFromEnvLoadsRuntimeFlagsAndJwtSettings(): void
    {
        $this->setEnv('ADMIN_SMS_ENABLED', 'false');
        $this->setEnv('G5_INDEPENDENT', 'true');
        $this->setEnv('JWT_SECRET', 'jwt-secret');
        $this->setEnv('JWT_ACCESS_EXPIRES', '1200');
        $this->setEnv('JWT_REFRESH_EXPIRES', '7200');
        $this->setEnv('JWT_ISSUER', 'issuer-app');
        $this->setEnv('JWT_AUDIENCE', 'audience-app');
        $this->setEnv('JWT_LEEWAY_SECONDS', '45');

        $config = EnvConfig::fromEnv();

        self::assertFalse($config->adminSmsEnabled);
        self::assertTrue($config->g5Independent);
        self::assertSame('jwt-secret', $config->jwtSecret);
        self::assertSame(1200, $config->jwtAccessExpires);
        self::assertSame(7200, $config->jwtRefreshExpires);
        self::assertSame('issuer-app', $config->jwtIssuer);
        self::assertSame('audience-app', $config->jwtAudience);
        self::assertSame(45, $config->jwtLeewaySeconds);
    }

    private function setEnv(string $key, string $value): void
    {
        if (!array_key_exists($key, $this->envBackup)) {
            $this->envBackup[$key] = array_key_exists($key, $_ENV) ? (string)$_ENV[$key] : null;
        }

        $_ENV[$key] = $value;
        putenv($key . '=' . $value);
    }
}
