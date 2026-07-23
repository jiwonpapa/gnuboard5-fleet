<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Auth\Contracts\AuthGateway;
use Api\Integration\Contracts\PointMaintenanceGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Security\JwtService;
use PHPUnit\Framework\TestCase;
use Tests\Support\BuildsDomainServices;

final class AuthServicePointTest extends TestCase
{
    use BuildsDomainServices;

    public function testLoginSyncsPointTotalViaPointGateway(): void
    {
        $authGateway = $this->createMock(AuthGateway::class);
        $authGateway->method('isLoginBlocked')->willReturn(false);
        $authGateway->method('findMemberById')->willReturn([
            'mb_id' => 'user1',
            'mb_password' => password_hash('Abcd!2345', PASSWORD_DEFAULT),
            'mb_email_certify' => '2026-03-05 10:00:00',
        ]);
        $authGateway->method('isMemberActive')->willReturn(true);
        $authGateway->method('verifyPassword')->willReturn(true);
        $authGateway->method('isEmailCertificationRequiredAndMissing')->willReturn(false);

        $pointGateway = $this->createMock(PointMaintenanceGateway::class);
        $pointGateway->expects($this->once())
            ->method('syncTotal')
            ->with('user1');

        $service = $this->createAuthService($authGateway, $this->createJwtService(), $pointGateway);
        $result = $service->login('user1', 'Abcd!2345', '127.0.0.1');

        $this->assertArrayHasKey('access_token', $result);
        $this->assertArrayHasKey('refresh_token', $result);
        $this->assertArrayHasKey('expires_in', $result);
    }

    public function testRegisterGrantsRegisterAndRecommendPoints(): void
    {
        $authGateway = $this->createMock(AuthGateway::class);
        $authGateway->expects($this->once())
            ->method('registerMember')
            ->willReturn([
                'mb_id' => 'user123',
                'mb_name' => '홍길동',
                'mb_email' => 'user123@example.com',
                '_register_point' => 100,
                '_recommend_member_id' => 'recommender',
                '_recommend_point' => 30,
            ]);
        $authGateway->method('isEmailCertificationRequiredAndMissing')->willReturn(false);

        $grantCalls = [];
        $pointGateway = $this->createMock(PointRewardGateway::class);
        $pointGateway->expects($this->exactly(2))
            ->method('grant')
            ->willReturnCallback(
                function (
                    string $memberId,
                    int $point,
                    string $content,
                    string $relTable,
                    string $relId,
                    string $relAction,
                    ?int $expireDays = null
                ) use (&$grantCalls): void {
                    $grantCalls[] = [$memberId, $point, $content, $relTable, $relId, $relAction, $expireDays];
                }
            );

        $service = $this->createAuthService($authGateway, $this->createJwtService(), $pointGateway);
        $result = $service->register([
            'mb_id' => 'user123',
            'mb_password' => 'Abcd!2345',
            'mb_name' => '홍길동',
            'mb_nick' => '길동이',
            'mb_email' => 'user123@example.com',
            'mb_hp' => '010-1234-5678',
            'mb_ip' => '127.0.0.1',
            'mb_recommend' => 'recommender',
        ]);

        $this->assertSame('user123', $result['mb_id']);
        $this->assertCount(2, $grantCalls);
        $this->assertSame(['user123', 100, '회원가입 축하', '@member', 'user123', '회원가입', null], $grantCalls[0]);
        $this->assertSame(['recommender', 30, 'user123의 추천인', '@member', 'recommender', 'user123 추천', null], $grantCalls[1]);
    }

    private function createJwtService(): JwtService
    {
        return new JwtService('test-jwt-secret-1234567890-1234567890', 3600, 604800);
    }
}
