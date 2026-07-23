<?php

declare(strict_types=1);

namespace Tests\Admin\Dev;

use Api\Admin\Dev\Support\AdminSchemaInspectSecretGuard;
use Api\Core\Config\EnvConfig;
use PHPUnit\Framework\TestCase;
use Slim\Psr7\Factory\ServerRequestFactory;

final class AdminSchemaInspectSecretGuardTest extends TestCase
{
    public function testReadsExpectedAndProvidedSecret(): void
    {
        $guard = new AdminSchemaInspectSecretGuard();
        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/v1/admin-inspect/schema/config')
            ->withHeader(AdminSchemaInspectSecretGuard::HEADER_NAME, 'inspect-secret');

        self::assertSame('inspect-secret', $guard->expectedSecret($this->createEnvConfig('inspect-secret')));
        self::assertSame('inspect-secret', $guard->providedSecret($request));
    }

    public function testMatchesOnlyWhenConfiguredAndExact(): void
    {
        $guard = new AdminSchemaInspectSecretGuard();

        self::assertTrue($guard->isEnabled('inspect-secret'));
        self::assertFalse($guard->isEnabled(''));
        self::assertTrue($guard->matches('inspect-secret', 'inspect-secret'));
        self::assertFalse($guard->matches('inspect-secret', 'wrong-secret'));
        self::assertFalse($guard->matches('', 'inspect-secret'));
        self::assertFalse($guard->matches('inspect-secret', ''));
    }

    private function createEnvConfig(string $secret): EnvConfig
    {
        return new EnvConfig(
            filePermission: 0644,
            dirPermission: 0755,
            encryptFunc: 'create_hash',
            dataPath: sys_get_temp_dir() . '/g5-admin-schema-inspect',
            nicknameCooldownDays: 30,
            passwordResetUrl: '',
            emailVerifyUrl: '',
            uploadImageExtensions: 'jpg|jpeg|png|gif|webp|bmp',
            uploadFlashExtensions: 'swf',
            loginFailMaxAttempts: 5,
            loginFailWindowSeconds: 300,
            authExposeSensitiveTokens: false,
            authMailSendEnabled: false,
            authMailSubjectPrefix: '[G5 API]',
            authMailFrom: 'no-reply@example.com',
            authRegisterNotifyAdminEmail: '',
            authAutoRehashOnLogin: true,
            authPasswordResetTtlSeconds: 1800,
            authEmailVerifyTtlSeconds: 86400,
            unknownIpFallback: 'unknown',
            prohibitMemberIds: 'admin,administrator',
            prohibitEmailDomains: '',
            prohibitMemberNicks: '',
            pluginBoardRewardEnableGrant: false,
            adminSchemaInspectSecret: $secret
        );
    }
}
