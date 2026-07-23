<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Auth\External\Provider\FakeExternalAuthProviderAdapter;
use Api\Auth\External\Provider\GoogleExternalAuthProviderAdapter;
use Api\Auth\External\Provider\KakaoExternalAuthProviderAdapter;
use Api\Auth\External\Contracts\ExternalAuthHttpClient;
use Api\Auth\External\Repository\ExternalAuthLinkRepository;
use Api\Auth\External\Service\ExternalAuthLinkageService;
use Api\Auth\External\Service\ExternalAuthProviderRegistry;
use Api\Auth\External\Service\ExternalAuthService;
use Api\Auth\External\Support\ExternalAuthConfig;
use Api\Auth\External\Support\ExternalAuthProviderConfig;
use Api\Auth\External\Support\ExternalAuthProviderEndpointCatalog;
use Api\Auth\External\Support\ExternalAuthRequestTokenCodec;
use Api\Core\Config\G5Config;
use Api\Core\Config\RuntimeMode;
use Api\Core\Config\RuntimeProfile;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Auth\Contracts\AuthGateway;
use Api\Support\Exception\ApiException;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;

final class ExternalAuthServiceTest extends TestCase
{
    public function testListProvidersIncludesFakeInDev(): void
    {
        $service = $this->createService($this->devConfig(), $this->devProfile());

        $providers = $service->listProviders();

        self::assertCount(1, $providers);
        self::assertSame('fake', $providers[0]['provider'] ?? null);
        self::assertSame(true, $providers[0]['runtime_replay_enabled'] ?? null);
    }

    public function testListProvidersIncludesGoogleWhenConfiguredButReplayStaysDisabled(): void
    {
        $config = $this->devConfig();
        $httpClient = $this->createMock(ExternalAuthHttpClient::class);

        $registry = new ExternalAuthProviderRegistry([
            new FakeExternalAuthProviderAdapter($config),
            new GoogleExternalAuthProviderAdapter(
                $this->createG5Config([
                    'cf_google_clientid' => 'google-client-id',
                    'cf_google_secret' => 'google-client-secret',
                ]),
                $httpClient,
                new ExternalAuthProviderEndpointCatalog(),
                new ExternalAuthProviderConfig(),
                $this->devProfile()
            ),
            new KakaoExternalAuthProviderAdapter(
                $this->createG5Config([
                    'cf_kakao_rest_key' => 'kakao-rest-key',
                    'cf_kakao_client_secret' => '',
                ]),
                $httpClient,
                new ExternalAuthProviderEndpointCatalog(),
                new ExternalAuthProviderConfig(),
                $this->devProfile()
            ),
        ]);

        $authGateway = $this->createMock(AuthGateway::class);
        $authGateway->method('countMembersByEmail')->willReturn(0);
        $authGateway->method('findMemberByEmail')->willReturn(null);
        $authGateway->method('findMemberById')->willReturn(null);
        $authGateway->method('isMemberActive')->willReturn(true);

        $service = new ExternalAuthService(
            $registry,
            new ExternalAuthLinkageService($this->createLinkRepository(), $authGateway),
            new ExternalAuthRequestTokenCodec($config->requestTokenSecret, $config->requestTtlSeconds),
            $config,
            $this->devProfile(),
            new NullLogger()
        );

        $providers = $service->listProviders();

        self::assertCount(3, $providers);
        self::assertSame('fake', $providers[0]['provider'] ?? null);
        self::assertSame(true, $providers[0]['runtime_replay_enabled'] ?? null);
        self::assertSame('google', $providers[1]['provider'] ?? null);
        self::assertSame(false, $providers[1]['runtime_replay_enabled'] ?? null);
        self::assertSame('kakao', $providers[2]['provider'] ?? null);
        self::assertSame(false, $providers[2]['runtime_replay_enabled'] ?? null);
    }

    public function testListProvidersIsEmptyInProdWhenFakeDisabled(): void
    {
        $config = new ExternalAuthConfig(
            fakeProviderEnabled: false,
            allowReplayScenarios: false,
            requestTtlSeconds: 600,
            requestTokenSecret: 'prod-secret',
            fakeAuthorizeBaseUrl: '/fake-provider/authorize'
        );
        $service = $this->createService($config, $this->prodProfile());

        self::assertSame([], $service->listProviders());
    }

    public function testStartReturnsSignedRequestTokenAndAuthorizationUrl(): void
    {
        $service = $this->createService($this->devConfig(), $this->devProfile());

        $result = $service->start('fake', [
            'flow' => 'login',
            'callback_url' => 'rustadmin://auth/callback',
            'scopes' => ['profile', 'email'],
            'scenario' => 'success',
        ]);

        self::assertSame('fake', $result['provider'] ?? null);
        self::assertSame('login', $result['flow'] ?? null);
        self::assertSame('fake', $result['provider_mode'] ?? null);
        self::assertIsString($result['request_token'] ?? null);
        self::assertNotSame('', $result['request_token'] ?? '');
        self::assertStringContainsString('request_token=', (string)($result['authorization_url'] ?? ''));
        self::assertStringContainsString('state=', (string)($result['authorization_url'] ?? ''));
    }

    public function testCompleteReturnsNormalizedSuccessPayload(): void
    {
        $service = $this->createService($this->devConfig(), $this->devProfile());
        $start = $service->start('fake', [
            'flow' => 'login',
            'callback_url' => 'rustadmin://auth/callback',
            'scenario' => 'success',
        ]);

        $result = $service->complete('fake', [
            'request_token' => $start['request_token'],
            'state' => $start['state'],
            'payload' => [
                'scenario' => 'success',
            ],
        ]);

        self::assertSame('success', $result['status'] ?? null);
        self::assertSame('fake', $result['provider'] ?? null);
        self::assertArrayHasKey('provider_user', $result);
        self::assertArrayHasKey('linkage', $result);
        self::assertSame(['claim'], $result['available_actions'] ?? null);
        self::assertIsString($result['transition_token'] ?? null);
        self::assertNotSame('', $result['transition_token'] ?? '');
        self::assertIsString($result['link_token'] ?? null);
        self::assertNotSame('', $result['link_token'] ?? '');
        self::assertSame($result['transition_token'] ?? null, $result['link_token'] ?? null);
        self::assertSame('candidate', $result['linkage']['status'] ?? null);
        self::assertSame('fake-user-001', $result['provider_user']['provider_user_id'] ?? null);
        self::assertNull($result['error_code'] ?? null);
    }

    public function testCompleteRejectsTamperedRequestToken(): void
    {
        $service = $this->createService($this->devConfig(), $this->devProfile());
        $start = $service->start('fake', [
            'flow' => 'login',
            'callback_url' => 'rustadmin://auth/callback',
        ]);
        $tamperedToken = (string)$start['request_token'] . 'tampered';

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('외부 인증 요청 검증에 실패했습니다.');

        $service->complete('fake', [
            'request_token' => $tamperedToken,
            'state' => $start['state'],
        ]);
    }

    public function testStartRejectsInvalidCallbackUrl(): void
    {
        $service = $this->createService($this->devConfig(), $this->devProfile());

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('callback_url이 필요합니다.');

        $service->start('fake', [
            'flow' => 'login',
            'callback_url' => '',
        ]);
    }

    public function testStartRejectsFakeProviderInProd(): void
    {
        $config = new ExternalAuthConfig(
            fakeProviderEnabled: false,
            allowReplayScenarios: false,
            requestTtlSeconds: 600,
            requestTokenSecret: 'prod-secret',
            fakeAuthorizeBaseUrl: '/fake-provider/authorize'
        );
        $service = $this->createService($config, $this->prodProfile());

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('해당 외부 인증 공급자를 사용할 수 없습니다.');

        $service->start('fake', [
            'flow' => 'login',
            'callback_url' => 'rustadmin://auth/callback',
        ]);
    }

    public function testScenarioReplayIsRejectedWhenDisabled(): void
    {
        $config = new ExternalAuthConfig(
            fakeProviderEnabled: true,
            allowReplayScenarios: false,
            requestTtlSeconds: 600,
            requestTokenSecret: 'prod-secret',
            fakeAuthorizeBaseUrl: '/fake-provider/authorize'
        );
        $service = $this->createService($config, $this->prodProfile());

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('외부 인증 replay 시나리오는 현재 런타임에서 비활성화되어 있습니다.');

        $service->start('fake', [
            'flow' => 'login',
            'callback_url' => 'rustadmin://auth/callback',
            'scenario' => 'failed',
        ]);
    }

    private function createService(ExternalAuthConfig $config, RuntimeProfile $runtimeProfile): ExternalAuthService
    {
        $registry = new ExternalAuthProviderRegistry(
            $config->fakeProviderEnabled
                ? [new FakeExternalAuthProviderAdapter($config)]
                : []
        );
        $authGateway = $this->createMock(AuthGateway::class);
        $authGateway->method('countMembersByEmail')->willReturnCallback(
            static fn (string $email): int => strtolower($email) === 'fake-user@example.com' ? 1 : 0
        );
        $authGateway->method('findMemberByEmail')->willReturnCallback(
            static function (string $email): ?array {
                if (strtolower($email) !== 'fake-user@example.com') {
                    return null;
                }

                return [
                    'mb_id' => 'user1',
                    'mb_email' => 'fake-user@example.com',
                    'mb_name' => '홍길동',
                    'mb_nick' => '길동이',
                    'mb_level' => 2,
                ];
            }
        );
        $authGateway->method('findMemberById')->willReturn(null);
        $authGateway->method('isMemberActive')->willReturn(true);
        $linkRepository = $this->createLinkRepository();

        return new ExternalAuthService(
            $registry,
            new ExternalAuthLinkageService($linkRepository, $authGateway),
            new ExternalAuthRequestTokenCodec($config->requestTokenSecret, $config->requestTtlSeconds),
            $config,
            $runtimeProfile,
            new NullLogger()
        );
    }

    private function devConfig(): ExternalAuthConfig
    {
        return new ExternalAuthConfig(
            fakeProviderEnabled: true,
            allowReplayScenarios: true,
            requestTtlSeconds: 600,
            requestTokenSecret: 'dev-secret-1234567890',
            fakeAuthorizeBaseUrl: '/fake-provider/authorize'
        );
    }

    private function devProfile(): RuntimeProfile
    {
        return new RuntimeProfile(
            RuntimeMode::Dev,
            true,
            true,
            true,
            20,
            'test'
        );
    }

    private function prodProfile(): RuntimeProfile
    {
        return new RuntimeProfile(
            RuntimeMode::Prod,
            false,
            false,
            true,
            8,
            'test'
        );
    }

    private function createLinkRepository(): ExternalAuthLinkRepository
    {
        $this->resetTableReady();

        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeStatement')->willReturn(0);
        $qb->method('executeQuery')->willReturn($this->createResult(false));

        return new ExternalAuthLinkRepository($qb, new TableRegistry('g5_'));
    }

    /**
     * @param array<string, mixed> $row
     */
    private function createG5Config(array $row): G5Config
    {
        $qb = $this->createMock(QueryBuilder::class);
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($row);
        $qb->method('executeQuery')->willReturn($result);

        return new G5Config($qb, new TableRegistry('g5_'));
    }

    private function createResult(array|false $assoc): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);

        return $result;
    }

    private function resetTableReady(): void
    {
        $property = new \ReflectionProperty(ExternalAuthLinkRepository::class, 'tableReady');
        $property->setValue(null, false);
    }
}
