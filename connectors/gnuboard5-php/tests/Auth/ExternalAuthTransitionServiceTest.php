<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Auth\External\Repository\ExternalAuthLinkRepository;
use Api\Auth\External\Service\ExternalAuthTransitionService;
use Api\Auth\External\Support\ExternalAuthRequestTokenCodec;
use Api\Auth\Service\AuthInputHelper;
use Api\Auth\Service\AuthMailService;
use Api\Auth\Service\AuthRegistrationService;
use Api\Auth\Service\AuthSessionService;
use Api\Core\Config\EnvConfig;
use Api\Core\Plugin\EventDispatcher;
use Api\Auth\Contracts\AuthGateway;
use Api\Integration\Contracts\PointMaintenanceGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Security\JwtService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;

final class ExternalAuthTransitionServiceTest extends TestCase
{
    public function testCreateSessionIssuesTokensForLinkedMember(): void
    {
        $codec = new ExternalAuthRequestTokenCodec('transition-secret', 600);
        $transitionToken = $codec->issue([
            'kind' => 'external_transition',
            'provider' => 'fake',
            'flow' => 'login',
            'provider_user_id' => 'fake-user-001',
            'provider_email' => 'fake-user@example.com',
            'provider_profile' => [
                'provider_user_id' => 'fake-user-001',
                'email' => 'fake-user@example.com',
                'display_name' => 'Fake User',
            ],
        ]);

        $linkRepository = $this->createMock(ExternalAuthLinkRepository::class);
        $linkRepository->expects($this->once())
            ->method('findByProviderUser')
            ->with('fake', 'fake-user-001')
            ->willReturn([
                'link_id' => 1,
                'provider' => 'fake',
                'provider_user_id' => 'fake-user-001',
                'mb_id' => 'member1',
                'provider_email' => 'fake-user@example.com',
                'provider_profile_json' => '{"display_name":"Fake User"}',
                'linked_at' => '2026-03-07 14:00:00',
                'updated_at' => '2026-03-07 14:00:00',
            ]);

        $authGateway = $this->createMock(AuthGateway::class);
        $authGateway->expects($this->once())
            ->method('findMemberById')
            ->with('member1')
            ->willReturn([
                'mb_id' => 'member1',
                'mb_email' => 'fake-user@example.com',
            ]);
        $authGateway->method('isMemberActive')->willReturn(true);
        $authGateway->method('isEmailCertificationRequiredAndMissing')->willReturn(false);
        $authGateway->expects($this->once())
            ->method('updateTodayLogin')
            ->with('member1', '127.0.0.1');

        $pointGateway = $this->createMock(PointMaintenanceGateway::class);
        $pointGateway->expects($this->once())
            ->method('syncTotal')
            ->with('member1');

        $service = $this->createService($linkRepository, $authGateway, $pointGateway, $codec);

        $result = $service->createSession('fake', $transitionToken, '127.0.0.1');

        self::assertSame('member1', $result['mb_id'] ?? null);
        self::assertSame('fake', $result['provider'] ?? null);
        self::assertSame('fake-user-001', $result['provider_user_id'] ?? null);
        self::assertArrayHasKey('access_token', $result);
        self::assertArrayHasKey('refresh_token', $result);
        self::assertArrayHasKey('expires_in', $result);
        self::assertSame(1, $result['link']['link_id'] ?? null);
    }

    public function testCreateSessionRejectsWhenLinkIsMissing(): void
    {
        $codec = new ExternalAuthRequestTokenCodec('transition-secret', 600);
        $transitionToken = $codec->issue([
            'kind' => 'external_transition',
            'provider' => 'fake',
            'flow' => 'login',
            'provider_user_id' => 'missing-user',
        ]);

        $linkRepository = $this->createMock(ExternalAuthLinkRepository::class);
        $linkRepository->expects($this->once())
            ->method('findByProviderUser')
            ->with('fake', 'missing-user')
            ->willReturn(null);

        $service = $this->createService(
            $linkRepository,
            $this->createMock(AuthGateway::class),
            $this->createMock(PointMaintenanceGateway::class),
            $codec
        );

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('아직 회원 계정에 연결되지 않은 외부 인증입니다. 기존 회원 연결 또는 신규 가입을 먼저 진행해주세요.');

        $service->createSession('fake', $transitionToken, '127.0.0.1');
    }

    public function testClaimExistingMemberLinksAccountAndIssuesSession(): void
    {
        $codec = new ExternalAuthRequestTokenCodec('transition-secret', 600);
        $transitionToken = $codec->issue([
            'kind' => 'external_transition',
            'provider' => 'fake',
            'flow' => 'login',
            'provider_user_id' => 'fake-user-001',
            'provider_email' => 'fake-user@example.com',
            'provider_profile' => [
                'provider_user_id' => 'fake-user-001',
                'email' => 'fake-user@example.com',
                'display_name' => 'Fake User',
            ],
        ]);

        $linkRepository = $this->createMock(ExternalAuthLinkRepository::class);
        $linkRepository->expects($this->once())
            ->method('findByProviderUser')
            ->with('fake', 'fake-user-001')
            ->willReturn(null);
        $linkRepository->expects($this->once())
            ->method('saveLink')
            ->with(
                'fake',
                'fake-user-001',
                'member1',
                'fake-user@example.com',
                $this->callback(static fn (array $profile): bool => ($profile['display_name'] ?? null) === 'Fake User')
            )
            ->willReturn([
                'link_id' => 2,
                'provider' => 'fake',
                'provider_user_id' => 'fake-user-001',
                'mb_id' => 'member1',
                'provider_email' => 'fake-user@example.com',
                'provider_profile_json' => '{"display_name":"Fake User"}',
                'linked_at' => '2026-03-07 14:05:00',
                'updated_at' => '2026-03-07 14:05:00',
            ]);

        $authGateway = $this->createMock(AuthGateway::class);
        $authGateway->expects($this->once())
            ->method('findMemberById')
            ->with('member1')
            ->willReturn([
                'mb_id' => 'member1',
                'mb_email' => 'member1@example.com',
            ]);
        $authGateway->expects($this->once())
            ->method('verifyPassword')
            ->with($this->callback(static fn (array $member): bool => ($member['mb_id'] ?? '') === 'member1'), 'Abcd!2345')
            ->willReturn(true);
        $authGateway->method('isMemberActive')->willReturn(true);
        $authGateway->method('isEmailCertificationRequiredAndMissing')->willReturn(false);
        $authGateway->expects($this->once())
            ->method('updateTodayLogin')
            ->with('member1', '127.0.0.1');

        $pointGateway = $this->createMock(PointMaintenanceGateway::class);
        $pointGateway->expects($this->once())
            ->method('syncTotal')
            ->with('member1');

        $service = $this->createService($linkRepository, $authGateway, $pointGateway, $codec);

        $result = $service->claimExistingMember('fake', $transitionToken, 'member1', 'Abcd!2345', '127.0.0.1');

        self::assertSame('member1', $result['mb_id'] ?? null);
        self::assertTrue((bool)($result['claimed'] ?? false));
        self::assertSame(2, $result['link']['link_id'] ?? null);
        self::assertArrayHasKey('access_token', $result);
        self::assertArrayHasKey('refresh_token', $result);
    }

    public function testRegisterMemberUsesProviderDefaultsAndSavesLink(): void
    {
        $codec = new ExternalAuthRequestTokenCodec('transition-secret', 600);
        $transitionToken = $codec->issue([
            'kind' => 'external_transition',
            'provider' => 'fake',
            'flow' => 'login',
            'provider_user_id' => 'fake-user-001',
            'provider_email' => 'fake-user@example.com',
            'provider_profile' => [
                'provider_user_id' => 'fake-user-001',
                'email' => 'fake-user@example.com',
                'display_name' => 'Fake User',
            ],
        ]);

        $linkRepository = $this->createMock(ExternalAuthLinkRepository::class);
        $linkRepository->expects($this->once())
            ->method('findByProviderUser')
            ->with('fake', 'fake-user-001')
            ->willReturn(null);
        $linkRepository->expects($this->once())
            ->method('saveLink')
            ->with(
                'fake',
                'fake-user-001',
                'newuser',
                'fake-user@example.com',
                $this->callback(static fn (array $profile): bool => ($profile['display_name'] ?? null) === 'Fake User')
            )
            ->willReturn([
                'link_id' => 3,
                'provider' => 'fake',
                'provider_user_id' => 'fake-user-001',
                'mb_id' => 'newuser',
                'provider_email' => 'fake-user@example.com',
                'provider_profile_json' => '{"display_name":"Fake User"}',
                'linked_at' => '2026-03-07 14:10:00',
                'updated_at' => '2026-03-07 14:10:00',
            ]);

        $authGateway = $this->createMock(AuthGateway::class);
        $authGateway->method('validateRegisterMemberId');
        $authGateway->method('validateRegisterNick');
        $authGateway->method('validateRegisterEmail');
        $authGateway->method('validateRegisterPhone');
        $authGateway->method('validateRegisterPassword');
        $authGateway->method('isEmailCertificationRequiredAndMissing')->willReturn(false);
        $authGateway->expects($this->once())
            ->method('registerMember')
            ->with($this->callback(static function (array $payload): bool {
                return ($payload['mb_id'] ?? '') === 'newuser'
                    && ($payload['mb_password'] ?? '') === 'Abcd!2345'
                    && ($payload['mb_nick'] ?? '') === '새유저'
                    && ($payload['mb_email'] ?? '') === 'fake-user@example.com'
                    && ($payload['mb_name'] ?? '') === 'Fake User'
                    && ($payload['mb_ip'] ?? '') === '127.0.0.1';
            }))
            ->willReturn([
                'mb_id' => 'newuser',
                'mb_email' => 'fake-user@example.com',
                'mb_name' => 'Fake User',
                '_register_point' => 0,
                '_recommend_member_id' => '',
                '_recommend_point' => 0,
            ]);

        $service = $this->createService(
            $linkRepository,
            $authGateway,
            $this->createMock(PointRewardGateway::class),
            $codec
        );

        $result = $service->registerMember('fake', $transitionToken, [
            'mb_id' => 'newuser',
            'mb_password' => 'Abcd!2345',
            'mb_nick' => '새유저',
        ], '127.0.0.1');

        self::assertSame('newuser', $result['mb_id'] ?? null);
        self::assertTrue((bool)($result['registered'] ?? false));
        self::assertSame('fake-user@example.com', $result['link']['provider_email'] ?? null);
        self::assertArrayHasKey('access_token', $result);
        self::assertArrayHasKey('refresh_token', $result);
        self::assertArrayHasKey('expires_in', $result);
    }

    public function testRegisterMemberRejectsWhenProviderDoesNotSupplyEmailAndInputIsMissing(): void
    {
        $codec = new ExternalAuthRequestTokenCodec('transition-secret', 600);
        $transitionToken = $codec->issue([
            'kind' => 'external_transition',
            'provider' => 'fake',
            'flow' => 'login',
            'provider_user_id' => 'fake-user-001',
            'provider_profile' => [
                'provider_user_id' => 'fake-user-001',
                'display_name' => 'Fake User',
            ],
        ]);

        $service = $this->createService(
            $this->createMock(ExternalAuthLinkRepository::class),
            $this->createMock(AuthGateway::class),
            $this->createMock(PointRewardGateway::class),
            $codec
        );

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('mb_email이 필요합니다. 공급자 이메일이 없으면 직접 입력해야 합니다.');

        $service->registerMember('fake', $transitionToken, [
            'mb_id' => 'newuser',
            'mb_password' => 'Abcd!2345',
            'mb_nick' => '새유저',
        ], '127.0.0.1');
    }

    private function createService(
        ExternalAuthLinkRepository $linkRepository,
        AuthGateway $authGateway,
        mixed $pointGateway,
        ExternalAuthRequestTokenCodec $codec
    ): ExternalAuthTransitionService {
        $envConfig = $this->createEnvConfig();
        $jwtService = new JwtService('test-jwt-secret-1234567890-1234567890', 3600, 604800);
        $logger = new NullLogger();
        $events = new EventDispatcher();
        $resolvedPointMaintenanceGateway = $pointGateway instanceof PointMaintenanceGateway
            ? $pointGateway
            : $this->createMock(PointMaintenanceGateway::class);
        $resolvedPointRewardGateway = $pointGateway instanceof PointRewardGateway
            ? $pointGateway
            : $this->createMock(PointRewardGateway::class);

        return new ExternalAuthTransitionService(
            $linkRepository,
            $codec,
            $authGateway,
            new AuthSessionService(
                $authGateway,
                $authGateway,
                $jwtService,
                $resolvedPointMaintenanceGateway,
                $envConfig,
                $logger,
                $events
            ),
            new AuthRegistrationService(
                $authGateway,
                $authGateway,
                $authGateway,
                $jwtService,
                $resolvedPointRewardGateway,
                new AuthInputHelper(),
                new AuthMailService($envConfig, $logger),
                $events
            ),
            $logger
        );
    }

    private function createEnvConfig(): EnvConfig
    {
        return new EnvConfig(
            filePermission: 0644,
            dirPermission: 0755,
            encryptFunc: 'create_hash',
            dataPath: sys_get_temp_dir() . '/g5-api-external-transition',
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
