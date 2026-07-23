<?php

declare(strict_types=1);

namespace Tests\Core\Middleware;

use Api\Core\Config\RuntimeMode;
use Api\Core\Config\RuntimeProfile;
use Api\Core\Exception\ApiException as CoreApiException;
use Api\Core\Middleware\ErrorMiddleware;
use Api\Support\Exception\ApiException as LegacyApiException;
use PHPUnit\Framework\TestCase;
use Psr\Log\AbstractLogger;
use RuntimeException;
use Slim\Psr7\Factory\ResponseFactory;
use Slim\Psr7\Factory\ServerRequestFactory;

final class ErrorMiddlewareTest extends TestCase
{
    private ErrorMiddleware $middleware;
    private CollectingLogger $logger;

    protected function setUp(): void
    {
        $this->logger = new CollectingLogger();
        $this->middleware = $this->createMiddleware(RuntimeMode::Prod, $this->logger);
    }

    public function testUnhandledExceptionIncludesRequestIdAndGenericGuide(): void
    {
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/api/v1/test');

        $response = ($this->middleware)($request, new RuntimeException('boom'), false, true, true);
        $payload = $this->decode($response->getBody()->__toString());

        $this->assertSame(500, $response->getStatusCode());
        $this->assertNotSame('', $response->getHeaderLine('X-Request-Id'));
        $this->assertSame($response->getHeaderLine('X-Request-Id'), $payload['request_id']);
        $this->assertSame($response->getHeaderLine('X-Correlation-Id'), $payload['correlation_id']);
        $this->assertSame($response->getHeaderLine('X-Server-Request-Id'), $payload['server_request_id']);
        $this->assertSame($payload['request_id'], $payload['meta']['request_id']);
        $this->assertSame($payload['correlation_id'], $payload['meta']['correlation_id']);
        $this->assertSame($payload['server_request_id'], $payload['meta']['server_request_id']);
        $this->assertSame('server.runtime_error', $payload['error_code']);
        $this->assertSame('server', $payload['error_category']);
        $this->assertSame('server_runtime', $payload['fault_domain']);
        $this->assertSame('php_api', $payload['owner']);
        $this->assertFalse($payload['retryable']);
        $this->assertFalse($payload['user_actionable']);
        $this->assertSame('server.runtime_error', $payload['meta']['error_code']);
        $this->assertSame('server', $payload['meta']['error_category']);
        $this->assertSame('서버 내부 오류가 발생했습니다.', $payload['detail']);
        $this->assertSame('request_id와 요청 경로를 서버 로그에서 조회하세요.', $payload['guide']['action']);
        $this->assertSame('서버 처리 중 예외가 발생했습니다.', $payload['guide']['reason']);
    }

    public function testProdModeMasksServerErrorDetailEvenForApiException(): void
    {
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/api/v1/test');

        $response = ($this->middleware)(
            $request,
            CoreApiException::serviceUnavailable('DB 연결 실패: SQLSTATE[HY000] secret'),
            false,
            true,
            true
        );
        $payload = $this->decode($response->getBody()->__toString());

        $this->assertSame(503, $response->getStatusCode());
        $this->assertSame('서비스를 일시적으로 사용할 수 없습니다.', $payload['detail']);
        $this->assertArrayNotHasKey('debug', $payload);
        $this->assertSame('prod', $payload['meta']['runtime_mode']);
    }

    public function testCoreApiExceptionPreservesExplicitGuide(): void
    {
        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/v1/admin')
            ->withAttribute('request_id', 'req-123');

        $response = ($this->middleware)(
            $request,
            CoreApiException::forbidden('관리자만 접근할 수 있습니다.', [
                'action' => '관리자 권한을 확인하세요.',
                'reason' => '현재 계정은 관리자 권한이 없습니다.',
            ]),
            false,
            true,
            true
        );
        $payload = $this->decode($response->getBody()->__toString());

        $this->assertSame(403, $response->getStatusCode());
        $this->assertSame('req-123', $payload['request_id']);
        $this->assertSame('client', $payload['owner']);
        $this->assertSame('auth', $payload['fault_domain']);
        $this->assertSame('auth.forbidden', $payload['error_code']);
        $this->assertSame([
            'action' => '관리자 권한을 확인하세요.',
            'reason' => '현재 계정은 관리자 권한이 없습니다.',
        ], $payload['guide']);
    }

    public function testLegacyApiExceptionUsesDefaultGuideForConflict(): void
    {
        $request = (new ServerRequestFactory())->createServerRequest('POST', '/api/v1/members');

        $response = ($this->middleware)(
            $request,
            LegacyApiException::conflict('이미 존재하는 회원입니다.'),
            false,
            true,
            true
        );
        $payload = $this->decode($response->getBody()->__toString());

        $this->assertSame(409, $response->getStatusCode());
        $this->assertSame('request.conflict', $payload['error_code']);
        $this->assertSame('중복 또는 현재 상태 충돌 여부를 확인하세요.', $payload['guide']['action']);
        $this->assertSame('요청이 기존 데이터 또는 리소스 상태와 충돌합니다.', $payload['guide']['reason']);
    }

    public function testUnhandledDatabaseExceptionReturnsSafeDatabaseReason(): void
    {
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/api/v1/test');

        $response = ($this->middleware)(
            $request,
            new RuntimeException('SQLSTATE[HY000] [2002] Connection refused'),
            false,
            true,
            true
        );
        $payload = $this->decode($response->getBody()->__toString());

        $this->assertSame(500, $response->getStatusCode());
        $this->assertSame('server.database_error', $payload['error_code']);
        $this->assertSame('database', $payload['meta']['error_category']);
        $this->assertSame('database', $payload['fault_domain']);
        $this->assertSame('database', $payload['owner']);
        $this->assertSame('데이터베이스 처리 중 오류가 발생했습니다.', $payload['guide']['reason']);
    }

    public function testDevModeIncludesDebugPayloadAndSanitizedLogs(): void
    {
        $logger = new CollectingLogger();
        $middleware = $this->createMiddleware(RuntimeMode::Dev, $logger);

        $request = (new ServerRequestFactory())
            ->createServerRequest('POST', '/api/v1/members', ['REMOTE_ADDR' => '127.0.0.1'])
            ->withHeader('Authorization', 'Bearer top-secret')
            ->withHeader('Content-Type', 'application/json')
            ->withAttribute('request_id', 'req-dev')
            ->withAttribute('client_ip', '203.0.113.10')
            ->withAttribute('raw_body', '{"mb_id":"tester","password":"top-secret"}')
            ->withAttribute('auth_member', ['mb_id' => 'tester', 'mb_level' => 2, 'is_admin' => '']);

        $response = ($middleware)(
            $request,
            new RuntimeException('debug boom'),
            true,
            true,
            true
        );
        $payload = $this->decode($response->getBody()->__toString());

        $this->assertSame(500, $response->getStatusCode());
        $this->assertSame('debug boom', $payload['detail']);
        $this->assertSame('dev', $payload['meta']['runtime_mode']);
        $this->assertSame('debug boom', $payload['debug']['exception']['message']);
        $this->assertSame('tester', $payload['debug']['auth']['mb_id']);
        $this->assertSame('***', $payload['debug']['request']['payload']['password']);
        $this->assertSame('***', $payload['debug']['request']['headers']['authorization']);

        $this->assertSame('req-dev', $logger->context['request_id']);
        $this->assertSame('req-dev', $logger->context['correlation_id']);
        $this->assertSame('tester', $logger->context['auth']['mb_id']);
        $this->assertSame('***', $logger->context['request']['payload']['password']);
        $this->assertSame('***', $logger->context['request']['headers']['authorization']);
    }

    private function createMiddleware(RuntimeMode $mode, CollectingLogger $logger): ErrorMiddleware
    {
        return new ErrorMiddleware(
            new ResponseFactory(),
            $logger,
            new RuntimeProfile(
                $mode,
                $mode === RuntimeMode::Dev,
                true,
                true,
                10,
                'test'
            )
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function decode(string $json): array
    {
        /** @var array<string, mixed> $payload */
        $payload = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

        return $payload;
    }
}

final class CollectingLogger extends AbstractLogger
{
    public string $message = '';
    /** @var array<string, mixed> */
    public array $context = [];

    /**
     * @param mixed $level
     * @param array<string, mixed> $context
     */
    public function log($level, string|\Stringable $message, array $context = []): void
    {
        $this->message = (string)$message;
        $this->context = $context;
    }
}
