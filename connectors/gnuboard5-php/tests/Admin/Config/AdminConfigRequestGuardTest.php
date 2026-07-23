<?php

declare(strict_types=1);

namespace Tests\Admin\Config;

use Api\Admin\Config\Support\AdminConfigRequestGuard;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminConfigRequestGuardTest extends TestCase
{
    public function testAllowsUpdateWhenRemoteAddressDoesNotMatchBlockedPattern(): void
    {
        $guard = new AdminConfigRequestGuard();

        $guard->assertUpdateAllowed(
            ['cf_intercept_ip' => "10.0.0.1\n192.168.1.+"],
            '127.0.0.1',
        );

        self::assertTrue(true);
    }

    public function testRejectsUpdateWhenRemoteAddressMatchesBlockedPattern(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('현재 접속 IP : 192.168.1.24 가 차단될 수 있기 때문에, 다른 IP를 입력해 주세요.');

        $guard = new AdminConfigRequestGuard();
        $guard->assertUpdateAllowed(
            ['cf_intercept_ip' => "10.0.0.1\n192.168.1.+"],
            '192.168.1.24',
        );
    }
}
