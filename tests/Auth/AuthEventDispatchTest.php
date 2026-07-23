<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Core\Plugin\EventDispatcher;
use Api\Auth\Contracts\AuthGateway;
use Api\Integration\Contracts\PointMaintenanceGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Security\JwtService;
use PHPUnit\Framework\TestCase;
use Tests\Support\BuildsDomainServices;

final class AuthEventDispatchTest extends TestCase
{
    use BuildsDomainServices;

    public function testRegisterDispatchesMemberAndPointEvents(): void
    {
        $gateway = $this->createMock(AuthGateway::class);
        $gateway->method('validateRegisterMemberId');
        $gateway->method('validateRegisterNick');
        $gateway->method('validateRegisterEmail');
        $gateway->method('validateRegisterPhone');
        $gateway->method('validateRegisterPassword');
        $gateway->method('isEmailCertificationRequiredAndMissing')->willReturn(false);
        $gateway->method('registerMember')->willReturn([
            'mb_id' => 'user123',
            'mb_email' => 'user123@example.com',
            'mb_name' => '홍길동',
            '_register_point' => 100,
            '_recommend_member_id' => 'referrer1',
            '_recommend_point' => 50,
        ]);

        $pointGateway = $this->createMock(PointRewardGateway::class);
        $pointGateway->expects($this->exactly(2))->method('grant');

        $events = new EventDispatcher();
        $registered = [];
        $pointEvents = [];
        $events->listen('member.registered', static function (array $payload) use (&$registered): array {
            $registered = $payload;

            return $payload;
        });
        $events->listen('point.added', static function (array $payload) use (&$pointEvents): array {
            $pointEvents[] = $payload;

            return $payload;
        });

        $service = $this->createAuthService(
            $gateway,
            new JwtService('test-jwt-secret-1234567890-1234567890', 3600, 604800),
            $pointGateway,
            events: $events
        );

        $service->register([
            'mb_id' => 'user123',
            'mb_password' => 'Abcd!2345',
            'mb_name' => '홍길동',
            'mb_nick' => '길동이',
            'mb_email' => 'user123@example.com',
            'mb_hp' => '010-1234-5678',
            'mb_ip' => '127.0.0.1',
        ]);

        $this->assertSame('user123', $registered['member_id'] ?? null);
        $this->assertCount(2, $pointEvents);
        $this->assertSame(100, $pointEvents[0]['amount'] ?? null);
        $this->assertSame(50, $pointEvents[1]['amount'] ?? null);
    }

    public function testLoginDispatchesMemberLoginEvent(): void
    {
        $gateway = $this->createMock(AuthGateway::class);
        $gateway->method('isLoginBlocked')->willReturn(false);
        $gateway->method('findMemberById')->willReturn([
            'mb_id' => 'user1',
            'mb_password' => password_hash('Abcd!2345', PASSWORD_DEFAULT),
        ]);
        $gateway->method('isMemberActive')->willReturn(true);
        $gateway->method('verifyPassword')->willReturn(true);
        $gateway->method('isEmailCertificationRequiredAndMissing')->willReturn(false);
        $gateway->method('rehashPasswordIfNeeded');
        $gateway->method('clearFailedLoginAttempts');
        $gateway->method('updateTodayLogin');

        $pointGateway = $this->createMock(PointMaintenanceGateway::class);
        $pointGateway->method('syncTotal');

        $events = new EventDispatcher();
        $captured = [];
        $events->listen('member.login', static function (array $payload) use (&$captured): array {
            $captured = $payload;

            return $payload;
        });

        $service = $this->createAuthService(
            $gateway,
            new JwtService('test-jwt-secret-1234567890-1234567890', 3600, 604800),
            $pointGateway,
            events: $events
        );

        $service->login('user1', 'Abcd!2345', '127.0.0.1');

        $this->assertSame('user1', $captured['member_id'] ?? null);
        $this->assertSame('127.0.0.1', $captured['ip'] ?? null);
    }
}
