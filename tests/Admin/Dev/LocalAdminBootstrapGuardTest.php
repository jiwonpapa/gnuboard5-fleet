<?php

declare(strict_types=1);

namespace Tests\Admin\Dev;

use Api\Admin\Dev\Support\LocalAdminBootstrapGuard;
use PHPUnit\Framework\TestCase;

final class LocalAdminBootstrapGuardTest extends TestCase
{
    public function testAllowsPrivateNetworkInLocalModes(): void
    {
        $guard = new LocalAdminBootstrapGuard();

        self::assertTrue($guard->isAllowed('local', 'dev', '127.0.0.1'));
        self::assertTrue($guard->isAllowed('staging', '', '192.168.0.25'));
        self::assertTrue($guard->isAllowed('', '', '10.0.0.9'));
    }

    public function testRejectsProdOrPublicAddresses(): void
    {
        $guard = new LocalAdminBootstrapGuard();

        self::assertFalse($guard->isAllowed('production', 'prod', '127.0.0.1'));
        self::assertFalse($guard->isAllowed('local', 'dev', '8.8.8.8'));
        self::assertFalse($guard->isAllowed('production', '', '192.168.0.25'));
    }

    public function testNormalizesUnsafeTargetsToConfigForm(): void
    {
        $guard = new LocalAdminBootstrapGuard();

        self::assertSame('/adm/config_form.php', $guard->normalizeTarget(''));
        self::assertSame('/adm/config_form.php', $guard->normalizeTarget('https://example.com/adm/config_form.php'));
        self::assertSame('/adm/config_form.php', $guard->normalizeTarget('http://example.com/adm/config_form.php'));
        self::assertSame('/adm/config_form.php', $guard->normalizeTarget('/adm/config_form.php'));
        self::assertSame('/adm/config_form.php', $guard->normalizeTarget('adm/config_form.php'));
    }

    public function testResolvesConfiguredBootstrapMemberWithLegacyFallback(): void
    {
        $guard = new LocalAdminBootstrapGuard();

        self::assertSame('g5audit', $guard->resolveMemberId(' g5audit '));
        self::assertSame('neojins', $guard->resolveMemberId(''));
        self::assertSame('neojins', $guard->resolveMemberId(null));
    }
}
