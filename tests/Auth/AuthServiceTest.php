<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Auth\Contracts\AuthGateway;
use Api\Security\JwtService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;
use Tests\Support\BuildsDomainServices;

final class AuthServiceTest extends TestCase
{
    use BuildsDomainServices;

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

    public function testRequestPasswordResetDoesNotExposeMemberIdByDefault(): void
    {
        $this->setEnv('AUTH_EXPOSE_SENSITIVE_TOKENS', 'false');

        $gateway = $this->createGateway();
        $gateway->memberByEmail = ['mb_id' => 'user1'];
        $gateway->memberActive = true;
        $gateway->passwordResetToken = 'real-token';

        $service = $this->createAuthService($gateway, $this->createJwtService());
        $result = $service->requestPasswordReset('user1@example.com');

        $this->assertSame(['accepted' => true], $result);
    }

    public function testRequestPasswordResetReturnsDummyTokenWhenSensitiveModeAndMemberMissing(): void
    {
        $this->setEnv('AUTH_EXPOSE_SENSITIVE_TOKENS', 'true');

        $gateway = $this->createGateway();
        $gateway->memberByEmail = null;

        $service = $this->createAuthService($gateway, $this->createJwtService());
        $result = $service->requestPasswordReset('unknown@example.com');

        $this->assertSame(true, $result['accepted'] ?? false);
        $this->assertArrayHasKey('reset_token', $result);
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', (string)$result['reset_token']);
        $this->assertArrayNotHasKey('mb_id', $result);
    }

    public function testRequestPasswordResetReturnsTokenInSensitiveModeWithoutMemberId(): void
    {
        $this->setEnv('AUTH_EXPOSE_SENSITIVE_TOKENS', 'true');

        $gateway = $this->createGateway();
        $gateway->memberByEmail = ['mb_id' => 'user1'];
        $gateway->memberActive = true;
        $gateway->passwordResetToken = 'issued-reset-token';

        $service = $this->createAuthService($gateway, $this->createJwtService());
        $result = $service->requestPasswordReset('user1@example.com');

        $this->assertSame(true, $result['accepted'] ?? false);
        $this->assertSame('issued-reset-token', $result['reset_token'] ?? '');
        $this->assertArrayNotHasKey('mb_id', $result);
    }

    public function testRequestPasswordResetRejectsDuplicatedEmailWithoutMemberId(): void
    {
        $gateway = $this->createGateway();
        $gateway->memberCountByEmail = 2;

        $service = $this->createAuthService($gateway, $this->createJwtService());

        $this->expectException(\Api\Support\Exception\ApiException::class);
        $service->requestPasswordReset('dup@example.com');
    }

    public function testRequestPasswordResetAcceptsMemberIdEmailPairWhenDuplicatedEmailExists(): void
    {
        $this->setEnv('AUTH_EXPOSE_SENSITIVE_TOKENS', 'true');

        $gateway = $this->createGateway();
        $gateway->memberCountByEmail = 2;
        $gateway->memberById = [
            'mb_id' => 'user1',
            'mb_email' => 'dup@example.com',
            'mb_level' => 2,
        ];
        $gateway->memberActive = true;
        $gateway->passwordResetToken = 'reset-token-for-user1';

        $service = $this->createAuthService($gateway, $this->createJwtService());
        $result = $service->requestPasswordReset('dup@example.com', 'user1');

        $this->assertSame(true, $result['accepted'] ?? false);
        $this->assertSame('reset-token-for-user1', $result['reset_token'] ?? '');
    }

    public function testRequestPasswordResetSkipsAdminAccount(): void
    {
        $this->setEnv('AUTH_EXPOSE_SENSITIVE_TOKENS', 'false');

        $gateway = $this->createGateway();
        $gateway->memberByEmail = [
            'mb_id' => 'admin',
            'mb_email' => 'admin@example.com',
            'mb_level' => 10,
        ];
        $gateway->memberActive = true;

        $service = $this->createAuthService($gateway, $this->createJwtService());
        $result = $service->requestPasswordReset('admin@example.com');

        $this->assertSame(['accepted' => true], $result);
    }

    public function testRegisterMapsAgreementFlags(): void
    {
        $gateway = $this->createGateway();
        $service = $this->createAuthService($gateway, $this->createJwtService());

        $service->register([
            'mb_id' => 'user123',
            'mb_password' => 'Abcd!2345',
            'mb_name' => '홍길동',
            'mb_nick' => '길동이',
            'mb_email' => 'user123@example.com',
            'mb_hp' => '010-1234-5678',
            'mb_ip' => '127.0.0.1',
            'mb_recommend' => 'referrer1',
            'mb_mailling' => true,
            'mb_sms' => 'yes',
            'mb_open' => true,
            'mb_marketing_agree' => true,
            'mb_thirdparty_agree' => 'yes',
            'mb_homepage' => ' https://example.com ',
            'mb_tel' => ' 02-123-4567 ',
            'mb_addr1' => '서울시',
            'mb_addr2' => '강남구',
            'mb_addr3' => '역삼동',
            'mb_addr_jibeon' => 'r',
            'mb_zip' => '123-456',
            'mb_signature' => '서명',
            'mb_profile' => '프로필',
        ]);

        $this->assertIsArray($gateway->lastRegisteredMember);
        $this->assertSame('referrer1', $gateway->lastRegisteredMember['mb_recommend'] ?? null);
        $this->assertSame('01012345678', $gateway->lastRegisteredMember['mb_hp'] ?? null);
        $this->assertSame(1, $gateway->lastRegisteredMember['mb_mailling'] ?? null);
        $this->assertSame(1, $gateway->lastRegisteredMember['mb_sms'] ?? null);
        $this->assertSame(1, $gateway->lastRegisteredMember['mb_open'] ?? null);
        $this->assertSame(1, $gateway->lastRegisteredMember['mb_marketing_agree'] ?? null);
        $this->assertSame(1, $gateway->lastRegisteredMember['mb_thirdparty_agree'] ?? null);
        $this->assertSame('https://example.com', $gateway->lastRegisteredMember['mb_homepage'] ?? null);
        $this->assertSame('02-123-4567', $gateway->lastRegisteredMember['mb_tel'] ?? null);
        $this->assertSame('서울시', $gateway->lastRegisteredMember['mb_addr1'] ?? null);
        $this->assertSame('강남구', $gateway->lastRegisteredMember['mb_addr2'] ?? null);
        $this->assertSame('역삼동', $gateway->lastRegisteredMember['mb_addr3'] ?? null);
        $this->assertSame('R', $gateway->lastRegisteredMember['mb_addr_jibeon'] ?? null);
        $this->assertSame('123-456', $gateway->lastRegisteredMember['mb_zip'] ?? null);
        $this->assertSame('서명', $gateway->lastRegisteredMember['mb_signature'] ?? null);
        $this->assertSame('프로필', $gateway->lastRegisteredMember['mb_profile'] ?? null);
    }

    public function testRegisterRejectsIdentityAssertionFields(): void
    {
        $gateway = $this->createGateway();
        $service = $this->createAuthService($gateway, $this->createJwtService());

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('본인확인 필드는 공개 회원가입 API에서 직접 설정할 수 없습니다.');

        $service->register([
            'mb_id' => 'user123',
            'mb_password' => 'Abcd!2345',
            'mb_name' => '홍길동',
            'mb_nick' => '길동이',
            'mb_email' => 'user123@example.com',
            'mb_adult' => true,
        ]);
    }

    public function testLoginBlocksUnverifiedEmailWhenCertificationRequired(): void
    {
        $gateway = $this->createMock(AuthGateway::class);
        $gateway->method('isLoginBlocked')->willReturn(false);
        $gateway->method('findMemberById')->willReturn([
            'mb_id' => 'user1',
            'mb_password' => password_hash('Abcd!2345', PASSWORD_DEFAULT),
            'mb_email_certify' => '0000-00-00 00:00:00',
        ]);
        $gateway->method('isMemberActive')->willReturn(true);
        $gateway->method('verifyPassword')->willReturn(true);
        $gateway->method('isEmailCertificationRequiredAndMissing')->willReturn(true);

        $service = $this->createAuthService($gateway, $this->createJwtService());

        $this->expectException(\Api\Support\Exception\ApiException::class);
        $service->login('user1', 'Abcd!2345', '127.0.0.1');
    }

    public function testLoginRejectsInvalidMemberIdFormat(): void
    {
        $gateway = $this->createGateway();
        $service = $this->createAuthService($gateway, $this->createJwtService());

        try {
            $service->login('가나다', 'Abcd!2345', '127.0.0.1');
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame(400, $exception->statusCode);
        }
    }

    public function testRequestPasswordResetRejectsInvalidMemberIdFormat(): void
    {
        $gateway = $this->createGateway();
        $service = $this->createAuthService($gateway, $this->createJwtService());

        try {
            $service->requestPasswordReset('user1@example.com', '가나다');
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame(400, $exception->statusCode);
        }
    }

    public function testConfirmPasswordResetRejectsInvalidMemberIdFormat(): void
    {
        $gateway = $this->createGateway();
        $service = $this->createAuthService($gateway, $this->createJwtService());

        try {
            $service->confirmPasswordReset('한글id', 'token', 'Abcd!2345');
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame(400, $exception->statusCode);
        }
    }

    public function testConfirmEmailVerificationRejectsInvalidMemberIdFormat(): void
    {
        $gateway = $this->createGateway();
        $service = $this->createAuthService($gateway, $this->createJwtService());

        try {
            $service->confirmEmailVerification('한글id', 'token');
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame(400, $exception->statusCode);
        }
    }

    public function testRequestEmailReverificationRequiresValidCredentialsAndIssuesToken(): void
    {
        $this->setEnv('AUTH_EXPOSE_SENSITIVE_TOKENS', 'true');

        $gateway = $this->createMock(AuthGateway::class);
        $gateway->expects($this->exactly(2))
            ->method('findMemberById')
            ->with('user1')
            ->willReturn([
                'mb_id' => 'user1',
                'mb_email' => 'user1@example.com',
                'mb_password' => 'hashed-password',
                'mb_email_certify' => '0000-00-00 00:00:00',
            ]);
        $gateway->expects($this->exactly(2))
            ->method('isMemberActive')
            ->with('user1')
            ->willReturn(true);
        $gateway->expects($this->exactly(2))
            ->method('verifyPassword')
            ->with(
                $this->callback(static fn (array $member): bool => ($member['mb_id'] ?? '') === 'user1'),
                $this->logicalOr('wrong-pass', 'Abcd!2345')
            )
            ->willReturnCallback(static fn (array $member, string $password): bool => $password === 'Abcd!2345');
        $gateway->expects($this->once())
            ->method('isEmailCertificationRequiredAndMissing')
            ->willReturn(true);
        $gateway->expects($this->once())
            ->method('issueEmailVerifyToken')
            ->with('user1', 'changed@example.com')
            ->willReturn('verify-token-123');

        $service = $this->createAuthService($gateway, $this->createJwtService());

        try {
            $service->requestEmailReverification('user1', 'wrong-pass');
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame(401, $exception->statusCode);
        }

        $result = $service->requestEmailReverification('user1', 'Abcd!2345', 'changed@example.com');

        $this->assertSame(true, $result['accepted'] ?? false);
        $this->assertSame('verify-token-123', $result['verify_token'] ?? '');
        $this->assertSame('user1', $result['mb_id'] ?? '');
    }

    public function testCheckMemberIdAvailabilityReturnsAvailableWhenValidationPasses(): void
    {
        $gateway = $this->createMock(AuthGateway::class);
        $gateway->expects($this->once())
            ->method('validateRegisterMemberId')
            ->with('user123');

        $service = $this->createAuthService($gateway, $this->createJwtService());
        $result = $service->checkMemberIdAvailability(' user123 ');

        $this->assertSame('member_id', $result['type'] ?? null);
        $this->assertSame('user123', $result['normalized_value'] ?? null);
        $this->assertTrue((bool)($result['available'] ?? false));
        $this->assertSame('available', $result['reason'] ?? null);
    }

    public function testCheckEmailAvailabilityReturnsTakenReasonOnConflict(): void
    {
        $gateway = $this->createMock(AuthGateway::class);
        $gateway->expects($this->once())
            ->method('validateRegisterEmail')
            ->with('dup@example.com')
            ->willThrowException(ApiException::conflict('이미 사용중인 E-mail 주소입니다.'));

        $service = $this->createAuthService($gateway, $this->createJwtService());
        $result = $service->checkEmailAvailability('dup@example.com');

        $this->assertFalse((bool)($result['available'] ?? true));
        $this->assertSame('already_taken', $result['reason'] ?? null);
    }

    public function testCheckPhoneAvailabilityReturnsInvalidReasonOnBadRequest(): void
    {
        $gateway = $this->createMock(AuthGateway::class);
        $gateway->expects($this->once())
            ->method('validateRegisterPhone')
            ->with('010123')
            ->willThrowException(ApiException::badRequest('휴대폰 번호 형식이 올바르지 않습니다.'));

        $service = $this->createAuthService($gateway, $this->createJwtService());
        $result = $service->checkPhoneAvailability('010-123');

        $this->assertFalse((bool)($result['available'] ?? true));
        $this->assertSame('invalid', $result['reason'] ?? null);
    }

    public function testCheckRecommenderAvailabilityReturnsFeatureDisabledWhenRecommendIsOff(): void
    {
        $gateway = $this->createMock(AuthGateway::class);
        $gateway->expects($this->once())
            ->method('isRecommendationEnabled')
            ->willReturn(false);

        $service = $this->createAuthService($gateway, $this->createJwtService());
        $result = $service->checkRecommenderAvailability('referrer1');

        $this->assertFalse((bool)($result['available'] ?? true));
        $this->assertSame('feature_disabled', $result['reason'] ?? null);
    }

    public function testCheckRecommenderAvailabilityReturnsAvailableWhenMemberExists(): void
    {
        $gateway = $this->createMock(AuthGateway::class);
        $gateway->expects($this->once())
            ->method('isRecommendationEnabled')
            ->willReturn(true);
        $gateway->expects($this->once())
            ->method('findMemberById')
            ->with('referrer1')
            ->willReturn(['mb_id' => 'referrer1']);

        $service = $this->createAuthService($gateway, $this->createJwtService());
        $result = $service->checkRecommenderAvailability('referrer1');

        $this->assertTrue((bool)($result['available'] ?? false));
        $this->assertSame('available', $result['reason'] ?? null);
    }

    private function createJwtService(): JwtService
    {
        return new JwtService('test-jwt-secret-1234567890-1234567890', 3600, 604800);
    }

    /**
     * @return AuthGateway&object{memberByEmail:?array<string,mixed>, memberActive:bool, passwordResetToken:string, lastRegisteredMember:?array<string,mixed>}
     */
    private function createGateway(): AuthGateway
    {
        return new class () implements AuthGateway {
            /** @var array<string, mixed>|null */
            public ?array $memberByEmail = null;
            /** @var array<string, mixed>|null */
            public ?array $memberById = null;
            public int $memberCountByEmail = 0;
            public bool $memberActive = true;
            public string $passwordResetToken = 'token';
            /** @var array<string, mixed>|null */
            public ?array $lastRegisteredMember = null;

            public function findMemberById(string $memberId): ?array
            {
                return $this->memberById;
            }

            public function findMemberByEmail(string $email): ?array
            {
                return $this->memberByEmail;
            }

            public function countMembersByEmail(string $email): int
            {
                return $this->memberCountByEmail;
            }

            public function isRecommendationEnabled(): bool
            {
                return false;
            }

            public function isMemberActive(string $memberId): bool
            {
                return $this->memberActive;
            }

            public function registerMember(array $member): array
            {
                $this->lastRegisteredMember = $member;
                return $member;
            }

            public function verifyPassword(array $member, string $password): bool
            {
                return true;
            }

            public function rehashPasswordIfNeeded(array $member, string $plainPassword): void
            {
            }

            public function isEmailCertificationRequiredAndMissing(array $member): bool
            {
                return false;
            }

            public function hashPassword(string $plainPassword): string
            {
                return $plainPassword;
            }

            public function validateRegisterPassword(string $password): void
            {
            }

            public function validateRegisterMemberId(string $memberId): void
            {
            }

            public function validateRegisterNick(string $nick): void
            {
            }

            public function validateRegisterEmail(string $email): void
            {
            }

            public function validateRegisterPhone(string $phone): void
            {
            }

            public function isLoginBlocked(string $memberId, string $ipAddress, int $maxAttempts, int $windowSeconds): bool
            {
                return false;
            }

            public function registerFailedLoginAttempt(string $memberId, string $ipAddress): void
            {
            }

            public function clearFailedLoginAttempts(string $memberId, string $ipAddress): void
            {
            }

            public function updateTodayLogin(string $memberId, string $ipAddress): void
            {
            }

            public function revokeToken(string $memberId, string $jti, string $tokenType, int $expiresAt): void
            {
            }

            public function isTokenRevoked(string $jti, string $tokenType): bool
            {
                return false;
            }

            public function createPasswordResetToken(string $memberId): string
            {
                return $this->passwordResetToken;
            }

            public function resetPasswordByToken(string $memberId, string $token, string $newPassword): void
            {
            }

            public function issueEmailVerifyToken(string $memberId, ?string $email = null): string
            {
                return 'verify-token';
            }

            public function confirmEmailVerifyToken(string $memberId, string $token): void
            {
            }
        };
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
