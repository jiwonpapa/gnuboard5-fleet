<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Auth\External\Contracts\ExternalAuthHttpClient;
use Api\Auth\External\Provider\KakaoExternalAuthProviderAdapter;
use Api\Auth\External\Support\ExternalAuthProviderConfig;
use Api\Auth\External\Support\ExternalAuthProviderEndpointCatalog;
use Api\Core\Config\G5Config;
use Api\Core\Config\RuntimeMode;
use Api\Core\Config\RuntimeProfile;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Exception\ApiException;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class KakaoExternalAuthProviderAdapterTest extends TestCase
{
    /** @var array<string, string|false> */
    private array $envBackup = [];

    protected function setUp(): void
    {
        parent::setUp();

        foreach ($this->managedEnvKeys() as $key) {
            $this->envBackup[$key] = getenv($key);
            putenv($key);
            unset($_ENV[$key]);
        }
    }

    protected function tearDown(): void
    {
        foreach ($this->managedEnvKeys() as $key) {
            $previous = $this->envBackup[$key] ?? false;
            if ($previous === false) {
                putenv($key);
                unset($_ENV[$key]);
                continue;
            }

            putenv($key . '=' . $previous);
            $_ENV[$key] = (string)$previous;
        }

        parent::tearDown();
    }

    public function testDescribeReturnsSandboxModeWhenConfiguredInDev(): void
    {
        $adapter = $this->createAdapter();

        $description = $adapter->describe();

        self::assertSame('kakao', $description['provider'] ?? null);
        self::assertSame('sandbox', $description['mode'] ?? null);
        self::assertSame(['login', 'account_link'], $description['flows'] ?? null);
        self::assertSame(true, $description['sandbox_available'] ?? null);
        self::assertSame(false, $description['replay_supported'] ?? null);
    }

    public function testConfiguredWithoutClientSecretWhenRestKeyExists(): void
    {
        $adapter = new KakaoExternalAuthProviderAdapter(
            $this->createG5Config([
                'cf_kakao_rest_key' => 'kakao-rest-key',
                'cf_kakao_client_secret' => '',
            ]),
            $this->createMock(ExternalAuthHttpClient::class),
            new ExternalAuthProviderEndpointCatalog(),
            new ExternalAuthProviderConfig(),
            $this->devProfile()
        );

        self::assertTrue($adapter->isConfigured());
    }

    public function testStartBuildsAuthorizationUrlWithDefaultScopes(): void
    {
        $adapter = $this->createAdapter();

        $result = $adapter->start([
            'flow' => 'login',
            'callback_url' => 'https://example.com/callback/kakao',
            'state' => 'state-123',
            'scopes' => ['account_email'],
        ]);

        self::assertSame('GET', $result['callback_method'] ?? null);
        self::assertSame('sandbox', $result['provider_mode'] ?? null);

        $query = [];
        parse_str((string)parse_url((string)($result['authorization_url'] ?? ''), PHP_URL_QUERY), $query);

        self::assertSame('kakao-rest-key', $query['client_id'] ?? null);
        self::assertSame('https://example.com/callback/kakao', $query['redirect_uri'] ?? null);
        self::assertSame('code', $query['response_type'] ?? null);
        self::assertSame('state-123', $query['state'] ?? null);
        self::assertStringContainsString('account_email', (string)($query['scope'] ?? ''));
        self::assertStringContainsString('profile', (string)($query['scope'] ?? ''));
    }

    public function testCompleteReturnsNormalizedKakaoUser(): void
    {
        $httpClient = $this->createMock(ExternalAuthHttpClient::class);
        $httpClient
            ->expects(self::once())
            ->method('postForm')
            ->with(
                'https://kauth.kakao.com/oauth/token',
                self::callback(static function (array $form): bool {
                    return ($form['grant_type'] ?? null) === 'authorization_code'
                        && ($form['client_id'] ?? null) === 'kakao-rest-key'
                        && ($form['client_secret'] ?? null) === 'kakao-client-secret'
                        && ($form['redirect_uri'] ?? null) === 'https://example.com/callback/kakao'
                        && ($form['code'] ?? null) === 'auth-code-123';
                }),
                []
            )
            ->willReturn([
                'status' => 200,
                'body' => [
                    'access_token' => 'kakao-access-token',
                    'refresh_token' => 'kakao-refresh-token',
                    'token_type' => 'bearer',
                    'scope' => 'profile account_email',
                ],
                'raw_body' => '{"access_token":"kakao-access-token"}',
            ]);
        $httpClient
            ->expects(self::once())
            ->method('getJson')
            ->with(
                'https://kapi.kakao.com/v2/user/me',
                ['Authorization' => 'Bearer kakao-access-token']
            )
            ->willReturn([
                'status' => 200,
                'body' => [
                    'id' => 123456789,
                    'properties' => [
                        'nickname' => 'Fallback Name',
                    ],
                    'kakao_account' => [
                        'email' => 'USER@EXAMPLE.COM',
                        'is_email_verified' => true,
                        'is_email_valid' => true,
                        'profile' => [
                            'nickname' => 'Kakao User',
                            'profile_image_url' => 'https://example.com/kakao.png',
                        ],
                    ],
                ],
                'raw_body' => '{"id":123456789}',
            ]);

        $adapter = $this->createAdapter($httpClient);

        $result = $adapter->complete([
            'flow' => 'login',
            'request_token' => 'request-token-123',
            'code' => 'auth-code-123',
            'payload' => [],
            'claims' => [
                'callback_url' => 'https://example.com/callback/kakao',
            ],
        ]);

        self::assertSame('success', $result['status'] ?? null);
        self::assertSame('123456789', $result['provider_user']['provider_user_id'] ?? null);
        self::assertSame('user@example.com', $result['provider_user']['email'] ?? null);
        self::assertSame('Kakao User', $result['provider_user']['display_name'] ?? null);
        self::assertSame('https://example.com/kakao.png', $result['provider_user']['picture'] ?? null);
        self::assertSame(true, $result['provider_user']['email_verified'] ?? null);
        self::assertArrayNotHasKey('access_token', $result['provider_payload']['token'] ?? []);
        self::assertArrayNotHasKey('refresh_token', $result['provider_payload']['token'] ?? []);
        self::assertStringStartsWith('kakao_tx_', (string)($result['provider_tx_id'] ?? ''));
    }

    public function testCompleteMapsAccessDeniedToCancelledWithoutHttpCall(): void
    {
        $httpClient = $this->createMock(ExternalAuthHttpClient::class);
        $httpClient->expects(self::never())->method('postForm');
        $httpClient->expects(self::never())->method('getJson');

        $adapter = $this->createAdapter($httpClient);
        $result = $adapter->complete([
            'flow' => 'login',
            'request_token' => 'request-token-123',
            'payload' => [
                'error' => 'access_denied',
                'error_description' => 'user cancelled',
            ],
            'claims' => [
                'callback_url' => 'https://example.com/callback/kakao',
            ],
        ]);

        self::assertSame('cancelled', $result['status'] ?? null);
        self::assertSame(true, $result['retryable'] ?? null);
        self::assertSame(true, $result['user_action_required'] ?? null);
        self::assertSame('kakao.access_denied', $result['error_code'] ?? null);
    }

    public function testCompleteMapsInvalidGrantToExpired(): void
    {
        $httpClient = $this->createMock(ExternalAuthHttpClient::class);
        $httpClient
            ->expects(self::once())
            ->method('postForm')
            ->willReturn([
                'status' => 400,
                'body' => [
                    'error' => 'invalid_grant',
                    'error_description' => 'Bad Request',
                ],
                'raw_body' => '{"error":"invalid_grant"}',
            ]);
        $httpClient->expects(self::never())->method('getJson');

        $adapter = $this->createAdapter($httpClient);
        $result = $adapter->complete([
            'flow' => 'login',
            'request_token' => 'request-token-123',
            'code' => 'expired-code',
            'payload' => [],
            'claims' => [
                'callback_url' => 'https://example.com/callback/kakao',
            ],
        ]);

        self::assertSame('expired', $result['status'] ?? null);
        self::assertSame(true, $result['retryable'] ?? null);
        self::assertSame(true, $result['user_action_required'] ?? null);
        self::assertSame('kakao.invalid_grant', $result['error_code'] ?? null);
    }

    public function testStartRejectsUnsupportedFlow(): void
    {
        $adapter = $this->createAdapter();

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('kakao provider는 login, account_link flow만 지원합니다.');

        $adapter->start([
            'flow' => 'identity_verify',
            'callback_url' => 'https://example.com/callback/kakao',
            'state' => 'state-123',
        ]);
    }

    /**
     * @return list<string>
     */
    private function managedEnvKeys(): array
    {
        return [
            'AUTH_EXTERNAL_KAKAO_ENABLED',
            'AUTH_EXTERNAL_KAKAO_CLIENT_ID',
            'AUTH_EXTERNAL_KAKAO_CLIENT_SECRET',
            'AUTH_EXTERNAL_KAKAO_AUTHORIZE_URL',
            'AUTH_EXTERNAL_KAKAO_TOKEN_URL',
            'AUTH_EXTERNAL_KAKAO_USERINFO_URL',
        ];
    }

    private function createAdapter(?ExternalAuthHttpClient $httpClient = null): KakaoExternalAuthProviderAdapter
    {
        return new KakaoExternalAuthProviderAdapter(
            $this->createG5Config([
                'cf_kakao_rest_key' => 'kakao-rest-key',
                'cf_kakao_client_secret' => 'kakao-client-secret',
            ]),
            $httpClient ?? $this->createMock(ExternalAuthHttpClient::class),
            new ExternalAuthProviderEndpointCatalog(),
            new ExternalAuthProviderConfig(),
            $this->devProfile()
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

    /**
     * @param array<string, scalar|null> $configRow
     */
    private function createG5Config(array $configRow): G5Config
    {
        $queryBuilder = $this->createMock(QueryBuilder::class);
        $result = $this->createMock(Result::class);
        $result
            ->method('fetchAssociative')
            ->willReturn($configRow);
        $queryBuilder
            ->method('executeQuery')
            ->willReturn($result);

        return new G5Config($queryBuilder, new TableRegistry('g5_'));
    }
}
