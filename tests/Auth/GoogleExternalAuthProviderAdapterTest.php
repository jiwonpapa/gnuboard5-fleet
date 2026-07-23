<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Auth\External\Contracts\ExternalAuthHttpClient;
use Api\Auth\External\Provider\GoogleExternalAuthProviderAdapter;
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

final class GoogleExternalAuthProviderAdapterTest extends TestCase
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

        self::assertSame('google', $description['provider'] ?? null);
        self::assertSame('sandbox', $description['mode'] ?? null);
        self::assertSame(['login', 'account_link'], $description['flows'] ?? null);
        self::assertSame(true, $description['sandbox_available'] ?? null);
        self::assertSame(false, $description['replay_supported'] ?? null);
    }

    public function testStartBuildsAuthorizationUrlWithDefaultScopes(): void
    {
        $adapter = $this->createAdapter();

        $result = $adapter->start([
            'flow' => 'login',
            'callback_url' => 'https://example.com/callback/google',
            'state' => 'state-123',
            'scopes' => ['email'],
        ]);

        self::assertSame('GET', $result['callback_method'] ?? null);
        self::assertSame('sandbox', $result['provider_mode'] ?? null);

        $query = [];
        parse_str((string)parse_url((string)($result['authorization_url'] ?? ''), PHP_URL_QUERY), $query);

        self::assertSame('google-client-id', $query['client_id'] ?? null);
        self::assertSame('https://example.com/callback/google', $query['redirect_uri'] ?? null);
        self::assertSame('code', $query['response_type'] ?? null);
        self::assertSame('state-123', $query['state'] ?? null);
        self::assertStringContainsString('openid', (string)($query['scope'] ?? ''));
        self::assertStringContainsString('email', (string)($query['scope'] ?? ''));
        self::assertStringContainsString('profile', (string)($query['scope'] ?? ''));
    }

    public function testCompleteReturnsNormalizedGoogleUser(): void
    {
        $httpClient = $this->createMock(ExternalAuthHttpClient::class);
        $httpClient
            ->expects(self::once())
            ->method('postForm')
            ->with(
                'https://oauth2.googleapis.com/token',
                self::callback(static function (array $form): bool {
                    return ($form['code'] ?? null) === 'auth-code-123'
                        && ($form['client_id'] ?? null) === 'google-client-id'
                        && ($form['client_secret'] ?? null) === 'google-client-secret'
                        && ($form['redirect_uri'] ?? null) === 'https://example.com/callback/google'
                        && ($form['grant_type'] ?? null) === 'authorization_code';
                })
            )
            ->willReturn([
                'status' => 200,
                'body' => [
                    'access_token' => 'google-access-token',
                    'expires_in' => 3599,
                    'scope' => 'openid email profile',
                    'token_type' => 'Bearer',
                ],
                'raw_body' => '{"access_token":"google-access-token"}',
            ]);
        $httpClient
            ->expects(self::once())
            ->method('getJson')
            ->with(
                'https://openidconnect.googleapis.com/v1/userinfo',
                ['Authorization' => 'Bearer google-access-token']
            )
            ->willReturn([
                'status' => 200,
                'body' => [
                    'sub' => 'google-user-001',
                    'email' => 'USER@example.com',
                    'name' => 'Google User',
                    'picture' => 'https://example.com/picture.png',
                    'email_verified' => true,
                ],
                'raw_body' => '{"sub":"google-user-001"}',
            ]);

        $adapter = $this->createAdapter($httpClient);

        $result = $adapter->complete([
            'flow' => 'login',
            'request_token' => 'request-token-123',
            'code' => 'auth-code-123',
            'payload' => [],
            'claims' => [
                'callback_url' => 'https://example.com/callback/google',
            ],
        ]);

        self::assertSame('success', $result['status'] ?? null);
        self::assertSame(false, $result['retryable'] ?? null);
        self::assertSame(false, $result['user_action_required'] ?? null);
        self::assertSame('google-user-001', $result['provider_user']['provider_user_id'] ?? null);
        self::assertSame('user@example.com', $result['provider_user']['email'] ?? null);
        self::assertSame('Google User', $result['provider_user']['display_name'] ?? null);
        self::assertArrayNotHasKey('access_token', $result['provider_payload']['token'] ?? []);
        self::assertStringStartsWith('google_tx_', (string)($result['provider_tx_id'] ?? ''));
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
                'callback_url' => 'https://example.com/callback/google',
            ],
        ]);

        self::assertSame('cancelled', $result['status'] ?? null);
        self::assertSame(true, $result['retryable'] ?? null);
        self::assertSame(true, $result['user_action_required'] ?? null);
        self::assertSame('google.access_denied', $result['error_code'] ?? null);
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
                'callback_url' => 'https://example.com/callback/google',
            ],
        ]);

        self::assertSame('expired', $result['status'] ?? null);
        self::assertSame(true, $result['retryable'] ?? null);
        self::assertSame(true, $result['user_action_required'] ?? null);
        self::assertSame('google.invalid_grant', $result['error_code'] ?? null);
    }

    public function testStartRejectsUnsupportedFlow(): void
    {
        $adapter = $this->createAdapter();

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('google provider는 login, account_link flow만 지원합니다.');

        $adapter->start([
            'flow' => 'identity_verify',
            'callback_url' => 'https://example.com/callback/google',
            'state' => 'state-123',
        ]);
    }

    /**
     * @param string[] $keys
     * @return list<string>
     */
    private function managedEnvKeys(): array
    {
        return [
            'AUTH_EXTERNAL_GOOGLE_ENABLED',
            'AUTH_EXTERNAL_GOOGLE_CLIENT_ID',
            'AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET',
            'AUTH_EXTERNAL_GOOGLE_AUTHORIZE_URL',
            'AUTH_EXTERNAL_GOOGLE_TOKEN_URL',
            'AUTH_EXTERNAL_GOOGLE_USERINFO_URL',
        ];
    }

    private function createAdapter(?ExternalAuthHttpClient $httpClient = null): GoogleExternalAuthProviderAdapter
    {
        return new GoogleExternalAuthProviderAdapter(
            $this->createG5Config([
                'cf_google_clientid' => 'google-client-id',
                'cf_google_secret' => 'google-client-secret',
            ]),
            $httpClient ?? $this->createMock(ExternalAuthHttpClient::class),
            new ExternalAuthProviderEndpointCatalog(),
            new ExternalAuthProviderConfig(),
            new RuntimeProfile(
                RuntimeMode::Dev,
                true,
                true,
                true,
                20,
                'test'
            )
        );
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
}
