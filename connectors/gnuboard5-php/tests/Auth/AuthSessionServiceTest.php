<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Auth\Service\AuthSessionService;
use Api\Core\Config\EnvConfig;
use Api\Core\Plugin\EventDispatcher;
use Api\Auth\Contracts\AuthGateway;
use Api\Integration\Contracts\PointMaintenanceGateway;
use Api\Security\JwtService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

final class AuthSessionServiceTest extends TestCase
{
    public function testLoginRejectsBlockedUserAndMissingMember(): void
    {
        $jwt = $this->createJwtService();
        $pointGateway = $this->createMock(PointMaintenanceGateway::class);
        $logger = $this->createMock(LoggerInterface::class);

        $blockedGateway = $this->createMock(AuthGateway::class);
        $blockedGateway->expects($this->once())
            ->method('isLoginBlocked')
            ->with('user1', '127.0.0.1', 5, 300)
            ->willReturn(true);

        try {
            $this->createService($blockedGateway, $pointGateway, $logger, $jwt)
                ->login('user1', 'Abcd!2345', '127.0.0.1');
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('로그인 실패 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.', $exception->getMessage());
        }

        $missingGateway = $this->createMock(AuthGateway::class);
        $missingGateway->method('isLoginBlocked')->willReturn(false);
        $missingGateway->expects($this->once())
            ->method('findMemberById')
            ->with('user1')
            ->willReturn(null);
        $missingGateway->expects($this->once())
            ->method('registerFailedLoginAttempt')
            ->with('user1', '127.0.0.1');

        try {
            $this->createService($missingGateway, $pointGateway, $logger, $jwt)
                ->login('user1', 'Abcd!2345', '127.0.0.1');
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('아이디 또는 비밀번호가 일치하지 않습니다.', $exception->getMessage());
        }
    }

    public function testLoginRejectsInactiveOrWrongPasswordAndRegistersFailure(): void
    {
        $jwt = $this->createJwtService();
        $pointGateway = $this->createMock(PointMaintenanceGateway::class);
        $logger = $this->createMock(LoggerInterface::class);

        $inactiveGateway = $this->createMock(AuthGateway::class);
        $inactiveGateway->method('isLoginBlocked')->willReturn(false);
        $inactiveGateway->method('findMemberById')->willReturn(['mb_id' => 'user1']);
        $inactiveGateway->method('isMemberActive')->willReturn(false);

        try {
            $this->createService($inactiveGateway, $pointGateway, $logger, $jwt)
                ->login('user1', 'Abcd!2345', '127.0.0.1');
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('비활성 회원입니다.', $exception->getMessage());
        }

        $wrongPasswordGateway = $this->createMock(AuthGateway::class);
        $wrongPasswordGateway->method('isLoginBlocked')->willReturn(false);
        $wrongPasswordGateway->method('findMemberById')->willReturn(['mb_id' => 'user1']);
        $wrongPasswordGateway->method('isMemberActive')->willReturn(true);
        $wrongPasswordGateway->method('verifyPassword')->willReturn(false);
        $wrongPasswordGateway->expects($this->once())
            ->method('registerFailedLoginAttempt')
            ->with('user1', '127.0.0.1');

        try {
            $this->createService($wrongPasswordGateway, $pointGateway, $logger, $jwt)
                ->login('user1', 'Abcd!2345', '127.0.0.1');
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('아이디 또는 비밀번호가 일치하지 않습니다.', $exception->getMessage());
        }
    }

    public function testLoginSuccessLogsWarningsWhenRehashAndPointSyncFail(): void
    {
        $jwt = $this->createJwtService();
        $authGateway = $this->createMock(AuthGateway::class);
        $authGateway->method('isLoginBlocked')->willReturn(false);
        $authGateway->method('findMemberById')->willReturn([
            'mb_id' => 'user1',
            'mb_password' => password_hash('Abcd!2345', PASSWORD_DEFAULT),
        ]);
        $authGateway->method('isMemberActive')->willReturn(true);
        $authGateway->method('verifyPassword')->willReturn(true);
        $authGateway->method('isEmailCertificationRequiredAndMissing')->willReturn(false);
        $authGateway->method('rehashPasswordIfNeeded')->willThrowException(new \RuntimeException('rehash failed'));
        $authGateway->expects($this->once())->method('clearFailedLoginAttempts')->with('user1', '127.0.0.1');
        $authGateway->expects($this->once())->method('updateTodayLogin')->with('user1', '127.0.0.1');

        $pointGateway = $this->createMock(PointMaintenanceGateway::class);
        $pointGateway->method('syncTotal')->willThrowException(new \RuntimeException('sync failed'));

        $logger = $this->createMock(LoggerInterface::class);
        $logger->expects($this->exactly(2))
            ->method('warning')
            ->with(
                $this->logicalOr('[auth] password rehash skipped', '[auth] point total sync skipped'),
                $this->callback(static fn (array $context): bool => ($context['mb_id'] ?? '') === 'user1')
            );

        $events = new EventDispatcher();
        $captured = [];
        $events->listen('member.login', static function (array $payload) use (&$captured): array {
            $captured = $payload;
            return $payload;
        });

        $result = $this->createService($authGateway, $pointGateway, $logger, $jwt, $events)
            ->login('user1', 'Abcd!2345', '127.0.0.1');

        $this->assertArrayHasKey('access_token', $result);
        $this->assertArrayHasKey('refresh_token', $result);
        $this->assertSame('user1', $captured['member_id'] ?? null);
        $this->assertSame('127.0.0.1', $captured['ip'] ?? null);
    }

    public function testRefreshRejectsRevokedOrInactiveTokenAndRefreshesValidToken(): void
    {
        $jwt = $this->createJwtService();
        $revokedToken = $jwt->issueRefreshToken('user1');
        $inactiveToken = $jwt->issueRefreshToken('user1');
        $validToken = $jwt->issueRefreshToken('user1');

        $revokedGateway = $this->createMock(AuthGateway::class);
        $revokedGateway->method('isTokenRevoked')->willReturn(true);

        try {
            $this->createService($revokedGateway, $this->createMock(PointMaintenanceGateway::class), $this->createMock(LoggerInterface::class), $jwt)
                ->refresh($revokedToken);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('폐기된 Refresh 토큰입니다.', $exception->getMessage());
        }

        $inactiveGateway = $this->createMock(AuthGateway::class);
        $inactiveGateway->method('isTokenRevoked')->willReturn(false);
        $inactiveGateway->method('isMemberActive')->willReturn(false);

        try {
            $this->createService($inactiveGateway, $this->createMock(PointMaintenanceGateway::class), $this->createMock(LoggerInterface::class), $jwt)
                ->refresh($inactiveToken);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('비활성 계정입니다.', $exception->getMessage());
        }

        $validGateway = $this->createMock(AuthGateway::class);
        $validGateway->method('isTokenRevoked')->willReturn(false);
        $validGateway->method('isMemberActive')->willReturn(true);
        $validGateway->expects($this->once())
            ->method('revokeToken')
            ->with(
                'user1',
                $this->isType('string'),
                'refresh',
                $this->greaterThan(time())
            );

        $result = $this->createService($validGateway, $this->createMock(PointMaintenanceGateway::class), $this->createMock(LoggerInterface::class), $jwt)
            ->refresh($validToken);

        $this->assertArrayHasKey('access_token', $result);
        $this->assertArrayHasKey('refresh_token', $result);
    }

    public function testLogoutRejectsOtherMembersRefreshTokenAndRevokesMatchingTokens(): void
    {
        $jwt = $this->createJwtService();
        $foreignToken = $jwt->issueRefreshToken('other');
        $ownToken = $jwt->issueRefreshToken('user1');

        $forbiddenGateway = $this->createMock(AuthGateway::class);
        $forbiddenGateway->expects($this->once())
            ->method('revokeToken')
            ->with('user1', 'access-1', 'access', $this->greaterThan(time()));

        try {
            $this->createService($forbiddenGateway, $this->createMock(PointMaintenanceGateway::class), $this->createMock(LoggerInterface::class), $jwt)
                ->logout(['mb_id' => 'user1'], ['jti' => 'access-1', 'exp' => time() + 300], $foreignToken);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('다른 회원의 Refresh 토큰은 로그아웃 처리할 수 없습니다.', $exception->getMessage());
        }

        $successGateway = $this->createMock(AuthGateway::class);
        $successGateway->expects($this->exactly(2))
            ->method('revokeToken');

        $result = $this->createService($successGateway, $this->createMock(PointMaintenanceGateway::class), $this->createMock(LoggerInterface::class), $jwt)
            ->logout(['mb_id' => 'user1'], ['jti' => 'access-2', 'exp' => time() + 300], $ownToken);

        $this->assertTrue($result['revoked']['access']);
        $this->assertTrue($result['revoked']['refresh']);
        $this->assertTrue($result['logged_out']);
    }

    private function createService(
        AuthGateway $authGateway,
        PointMaintenanceGateway $pointGateway,
        LoggerInterface $logger,
        JwtService $jwtService,
        ?EventDispatcher $events = null
    ): AuthSessionService {
        return new AuthSessionService(
            $authGateway,
            $authGateway,
            $jwtService,
            $pointGateway,
            $this->createEnvConfig(),
            $logger,
            $events ?? new EventDispatcher()
        );
    }

    private function createJwtService(): JwtService
    {
        return new JwtService('test-jwt-secret-1234567890-1234567890', 3600, 604800);
    }

    private function createEnvConfig(): EnvConfig
    {
        return new EnvConfig(
            filePermission: 0644,
            dirPermission: 0755,
            encryptFunc: 'create_hash',
            dataPath: sys_get_temp_dir() . '/g5-api-auth-session',
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
            pluginBoardRewardEnableGrant: false
        );
    }
}
