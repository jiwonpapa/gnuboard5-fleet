<?php

declare(strict_types=1);

namespace Tests\Member;

use Api\Integration\Contracts\AuthIdentityGateway;
use Api\Integration\Contracts\AuthRecoveryGateway;
use Api\Integration\Contracts\MemberGateway;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;
use Tests\Support\BuildsDomainServices;

final class MemberServiceTest extends TestCase
{
    use BuildsDomainServices;

    public function testGetMyProfileReturnsProfileFields(): void
    {
        $gateway = $this->createMock(MemberGateway::class);
        $gateway->expects($this->once())
            ->method('findById')
            ->with('user1')
            ->willReturn([
                'mb_id' => 'user1',
                'mb_name' => '홍길동',
                'mb_nick' => '길동',
                'mb_email' => 'user1@example.com',
                'mb_level' => 2,
                'mb_point' => 100,
                'mb_homepage' => 'https://example.com',
                'mb_zip' => '12345',
                'mb_addr1' => '서울시',
                'mb_addr2' => '강남구',
                'mb_today_login' => '2026-03-04 10:00:00',
                'mb_datetime' => '2026-01-01 09:00:00',
            ]);

        $service = $this->createMemberService($gateway, $this->createAuthIdentityGatewayStub());
        $profile = $service->getMyProfile(['mb_id' => 'user1']);

        $this->assertSame('user1', $profile['mb_id']);
        $this->assertSame('홍길동', $profile['mb_name']);
        $this->assertSame('user1@example.com', $profile['mb_email']);
    }

    public function testGetPublicProfileHidesEmailForNormalMember(): void
    {
        $gateway = $this->createMock(MemberGateway::class);
        $gateway->method('findById')->willReturn([
            'mb_id' => 'user2',
            'mb_nick' => '도사',
            'mb_level' => 3,
            'mb_point' => 500,
            'mb_email' => 'user2@example.com',
            'mb_open' => 1,
            'mb_homepage' => 'https://example.com',
            'mb_profile' => '소개입니다.',
            'mb_datetime' => '2026-03-01 10:00:00',
        ]);

        $service = $this->createMemberService($gateway, $this->createAuthIdentityGatewayStub());
        $profile = $service->getPublicProfile('user2', ['mb_level' => 2]);

        $this->assertSame('user2', $profile['mb_id']);
        $this->assertArrayNotHasKey('mb_email', $profile);
        $this->assertSame('https://example.com', $profile['mb_homepage']);
    }

    public function testGetPublicProfileIncludesEmailForAdminViewer(): void
    {
        $gateway = $this->createMock(MemberGateway::class);
        $gateway->method('findById')->willReturn([
            'mb_id' => 'user2',
            'mb_nick' => '도사',
            'mb_level' => 3,
            'mb_point' => 500,
            'mb_email' => 'user2@example.com',
            'mb_open' => 0,
        ]);

        $service = $this->createMemberService($gateway, $this->createAuthIdentityGatewayStub());
        $profile = $service->getPublicProfile('user2', ['mb_level' => 10]);

        $this->assertSame('user2@example.com', $profile['mb_email']);
    }

    public function testGetPublicProfileRejectsClosedProfileForGuestViewer(): void
    {
        $gateway = $this->createMock(MemberGateway::class);
        $gateway->method('findById')->willReturn([
            'mb_id' => 'user2',
            'mb_nick' => '도사',
            'mb_level' => 3,
            'mb_point' => 500,
            'mb_open' => 0,
        ]);

        $service = $this->createMemberService($gateway, $this->createAuthIdentityGatewayStub());

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('정보공개를 하지 않은 회원입니다.');

        $service->getPublicProfile('user2', []);
    }

    public function testUpdateMyProfileRejectsUnsupportedField(): void
    {
        $gateway = $this->createMock(MemberGateway::class);
        $gateway->method('findById')->willReturn([
            'mb_id' => 'user1',
            'mb_password' => password_hash('current-pass', PASSWORD_DEFAULT),
        ]);
        $gateway->method('verifyPassword')->willReturn(true);

        $service = $this->createMemberService($gateway, $this->createAuthIdentityGatewayStub());

        $this->expectException(ApiException::class);
        $service->updateMyProfile([
            'mb_id' => 'user1',
        ], [
            'mb_password_current' => 'current-pass',
            'mb_password_old' => 'x',
        ]);
    }

    public function testUpdateMyProfileRewritesAllowedFieldAndReturnsProfile(): void
    {
        $gateway = $this->createMock(MemberGateway::class);
        $gateway->expects($this->exactly(2))
            ->method('findById')
            ->with('user1')
            ->willReturnOnConsecutiveCalls(
                [
                    'mb_id' => 'user1',
                    'mb_password' => password_hash('current-pass', PASSWORD_DEFAULT),
                ],
                [
                    'mb_id' => 'user1',
                    'mb_name' => '홍길동',
                    'mb_nick' => '길동',
                    'mb_email' => 'user1@example.com',
                    'mb_level' => 2,
                    'mb_point' => 120,
                    'mb_homepage' => 'https://updated.example.com',
                    'mb_zip' => '12345',
                    'mb_addr1' => '서울시',
                    'mb_addr2' => '강남구',
                ]
            );
        $gateway->expects($this->once())
            ->method('verifyPassword')
            ->willReturn(true);
        $gateway->expects($this->once())
            ->method('update')
            ->with('user1', ['mb_homepage' => 'https://updated.example.com']);
        $service = $this->createMemberService($gateway, $this->createAuthIdentityGatewayStub());
        $profile = $service->updateMyProfile([
            'mb_id' => 'user1',
        ], [
            'mb_password_current' => 'current-pass',
            'mb_homepage' => 'https://updated.example.com',
        ]);

        $this->assertSame('https://updated.example.com', $profile['mb_homepage']);
    }

    public function testUpdateMyProfileMapsLegacyZipToZipSegments(): void
    {
        $gateway = $this->createMock(MemberGateway::class);
        $gateway->expects($this->exactly(2))
            ->method('findById')
            ->with('user1')
            ->willReturnOnConsecutiveCalls(
                [
                    'mb_id' => 'user1',
                    'mb_password' => password_hash('current-pass', PASSWORD_DEFAULT),
                ],
                [
                    'mb_id' => 'user1',
                    'mb_name' => '홍길동',
                    'mb_nick' => '길동',
                    'mb_email' => 'user1@example.com',
                    'mb_level' => 2,
                    'mb_point' => 120,
                    'mb_homepage' => '',
                    'mb_zip1' => '123',
                    'mb_zip2' => '456',
                    'mb_addr1' => '서울시',
                    'mb_addr2' => '강남구',
                ]
            );
        $gateway->expects($this->once())
            ->method('verifyPassword')
            ->willReturn(true);
        $gateway->expects($this->once())
            ->method('update')
            ->with('user1', ['mb_zip1' => '123', 'mb_zip2' => '456']);
        $service = $this->createMemberService($gateway, $this->createAuthIdentityGatewayStub());
        $profile = $service->updateMyProfile([
            'mb_id' => 'user1',
        ], [
            'mb_password_current' => 'current-pass',
            'mb_zip' => '123-456',
        ]);

        $this->assertSame('123456', $profile['mb_zip']);
        $this->assertSame('123', $profile['mb_zip1']);
        $this->assertSame('456', $profile['mb_zip2']);
    }

    public function testUpdateMyProfileSupportsConsentAndProfileFields(): void
    {
        $gateway = $this->createMock(MemberGateway::class);
        $gateway->expects($this->exactly(2))
            ->method('findById')
            ->with('user1')
            ->willReturnOnConsecutiveCalls(
                [
                    'mb_id' => 'user1',
                    'mb_password' => password_hash('current-pass', PASSWORD_DEFAULT),
                ],
                [
                    'mb_id' => 'user1',
                    'mb_name' => '홍길동',
                    'mb_nick' => '길동',
                    'mb_email' => 'user1@example.com',
                    'mb_level' => 2,
                    'mb_point' => 120,
                    'mb_homepage' => '',
                    'mb_zip1' => '',
                    'mb_zip2' => '',
                    'mb_addr1' => '',
                    'mb_addr2' => '',
                    'mb_addr3' => '역삼동',
                    'mb_addr_jibeon' => 'R',
                    'mb_mailling' => 1,
                    'mb_sms' => 0,
                    'mb_marketing_agree' => 1,
                    'mb_thirdparty_agree' => 0,
                    'mb_signature' => '서명입니다.',
                    'mb_profile' => '프로필입니다.',
                ]
            );
        $gateway->expects($this->once())
            ->method('verifyPassword')
            ->willReturn(true);
        $gateway->expects($this->once())
            ->method('update')
            ->with('user1', [
                'mb_mailling' => '1',
                'mb_sms' => '0',
                'mb_marketing_agree' => '1',
                'mb_thirdparty_agree' => '0',
                'mb_addr3' => '역삼동',
                'mb_addr_jibeon' => 'R',
                'mb_signature' => '서명입니다.',
                'mb_profile' => '프로필입니다.',
            ]);
        $service = $this->createMemberService($gateway, $this->createAuthIdentityGatewayStub());
        $profile = $service->updateMyProfile([
            'mb_id' => 'user1',
        ], [
            'mb_password_current' => 'current-pass',
            'mb_mailling' => true,
            'mb_sms' => false,
            'mb_marketing_agree' => true,
            'mb_thirdparty_agree' => false,
            'mb_addr3' => '역삼동',
            'mb_addr_jibeon' => 'r',
            'mb_signature' => '서명입니다.',
            'mb_profile' => '프로필입니다.',
        ]);

        $this->assertSame(1, $profile['mb_mailling']);
        $this->assertSame(0, $profile['mb_sms']);
        $this->assertSame(1, $profile['mb_marketing_agree']);
        $this->assertSame(0, $profile['mb_thirdparty_agree']);
        $this->assertSame('역삼동', $profile['mb_addr3']);
        $this->assertSame('R', $profile['mb_addr_jibeon']);
        $this->assertSame('서명입니다.', $profile['mb_signature']);
        $this->assertSame('프로필입니다.', $profile['mb_profile']);
    }

    public function testUpdateMyProfileRequiresCurrentPassword(): void
    {
        $gateway = $this->createMock(MemberGateway::class);
        $gateway->method('findById')->willReturn([
            'mb_id' => 'user1',
            'mb_password' => password_hash('current-pass', PASSWORD_DEFAULT),
        ]);

        $service = $this->createMemberService($gateway, $this->createAuthIdentityGatewayStub());

        $this->expectException(ApiException::class);
        $service->updateMyProfile(['mb_id' => 'user1'], ['mb_homepage' => 'https://example.com']);
    }

    public function testUpdateMyProfileEmailChangeIssuesVerifyToken(): void
    {
        $memberGateway = $this->createMock(MemberGateway::class);
        $memberGateway->expects($this->exactly(2))
            ->method('findById')
            ->with('user1')
            ->willReturnOnConsecutiveCalls(
                [
                    'mb_id' => 'user1',
                    'mb_password' => password_hash('current-pass', PASSWORD_DEFAULT),
                ],
                [
                    'mb_id' => 'user1',
                    'mb_name' => '홍길동',
                    'mb_nick' => '길동',
                    'mb_email' => 'user1_new@example.com',
                    'mb_level' => 2,
                    'mb_point' => 120,
                    'mb_homepage' => '',
                    'mb_zip1' => '',
                    'mb_zip2' => '',
                    'mb_addr1' => '',
                    'mb_addr2' => '',
                ]
            );
        $memberGateway->expects($this->once())
            ->method('verifyPassword')
            ->willReturn(true);
        $memberGateway->expects($this->once())
            ->method('validateEmailForUpdate')
            ->with('user1_new@example.com', 'user1');
        $memberGateway->expects($this->once())
            ->method('update')
            ->with('user1', ['mb_email' => 'user1_new@example.com']);

        $authRecoveryGateway = $this->createMock(AuthRecoveryGateway::class);
        $authRecoveryGateway->expects($this->once())
            ->method('issueEmailVerifyToken')
            ->with('user1')
            ->willReturn('verify-token-123');

        $service = $this->createMemberService(
            $memberGateway,
            $this->createAuthIdentityGatewayStub(),
            $authRecoveryGateway
        );
        $profile = $service->updateMyProfile([
            'mb_id' => 'user1',
        ], [
            'mb_password_current' => 'current-pass',
            'mb_email' => 'user1_new@example.com',
        ]);

        $this->assertSame('user1_new@example.com', $profile['mb_email']);
    }

    private function createAuthIdentityGatewayStub(): AuthIdentityGateway
    {
        return $this->createMock(AuthIdentityGateway::class);
    }
}
