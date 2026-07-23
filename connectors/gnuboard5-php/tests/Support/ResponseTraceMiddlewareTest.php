<?php

declare(strict_types=1);

namespace Tests\Support;

use Api\Middlewares\ResponseTraceMiddleware;
use Api\Support\Http\TraceContext;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\AbstractLogger;
use Slim\Psr7\Factory\ResponseFactory;
use Slim\Psr7\Factory\ServerRequestFactory;

final class ResponseTraceMiddlewareTest extends TestCase
{
    public function testInjectsTraceMetaAndResponseHeaders(): void
    {
        $logger = new CollectingLogger();
        $middleware = new ResponseTraceMiddleware($logger);
        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/v1/admin/config')
            ->withAttribute('request_id', 'corr-1')
            ->withAttribute('correlation_id', 'corr-1')
            ->withAttribute('server_request_id', 'srv-1')
            ->withAttribute('request_started_at', microtime(true) - 0.01);

        $response = $middleware->process($request, new JsonEnvelopeHandler());
        $payload = json_decode((string)$response->getBody(), true, 512, JSON_THROW_ON_ERROR);

        $this->assertSame('corr-1', $response->getHeaderLine('X-Correlation-Id'));
        $this->assertSame('corr-1', $response->getHeaderLine('X-Request-Id'));
        $this->assertSame('srv-1', $response->getHeaderLine('X-Server-Request-Id'));
        $this->assertSame('corr-1', $payload['meta']['request_id']);
        $this->assertSame('corr-1', $payload['meta']['correlation_id']);
        $this->assertSame('srv-1', $payload['meta']['server_request_id']);
        $this->assertSame('corr-1', $logger->context['correlation_id']);
        $this->assertSame('srv-1', $logger->context['server_request_id']);
        $this->assertSame(200, $logger->context['status']);
        $this->assertArrayHasKey('duration_ms', $logger->context);
    }

    public function testGeneratesSingleTraceForSuccessResponseWithoutRequestContext(): void
    {
        $logger = new CollectingLogger();
        $middleware = new ResponseTraceMiddleware($logger);
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/api/v1/health');

        $response = $middleware->process($request, new JsonEnvelopeHandler());
        $payload = json_decode((string)$response->getBody(), true, 512, JSON_THROW_ON_ERROR);

        $this->assertMatchesRegularExpression('/^[a-f0-9]{32}$/', $response->getHeaderLine('X-Request-Id'));
        $this->assertMatchesRegularExpression('/^[a-f0-9]{32}$/', $response->getHeaderLine('X-Server-Request-Id'));
        $this->assertSame($response->getHeaderLine('X-Request-Id'), $payload['meta']['request_id']);
        $this->assertSame($response->getHeaderLine('X-Correlation-Id'), $payload['meta']['correlation_id']);
        $this->assertSame($response->getHeaderLine('X-Server-Request-Id'), $payload['meta']['server_request_id']);
        $this->assertSame($response->getHeaderLine('X-Request-Id'), $logger->context['request_id']);
        $this->assertSame($response->getHeaderLine('X-Server-Request-Id'), $logger->context['server_request_id']);
    }

    public function testPrefersExistingProblemTraceHeadersOverFreshGeneration(): void
    {
        $logger = new CollectingLogger();
        $middleware = new ResponseTraceMiddleware($logger);
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/api/v1/admin/members');

        $response = $middleware->process($request, new ProblemDetailsHandler());
        $payload = json_decode((string)$response->getBody(), true, 512, JSON_THROW_ON_ERROR);

        $this->assertSame('corr-problem', $response->getHeaderLine('X-Request-Id'));
        $this->assertSame('corr-problem', $payload['request_id']);
        $this->assertSame('corr-problem', $payload['correlation_id']);
        $this->assertSame('corr-problem', $payload['meta']['request_id']);
        $this->assertSame('srv-problem', $response->getHeaderLine('X-Server-Request-Id'));
        $this->assertSame('srv-problem', $payload['server_request_id']);
        $this->assertSame('srv-problem', $payload['meta']['server_request_id']);
        $this->assertSame([], $logger->context);
    }
}

final class JsonEnvelopeHandler implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $response = (new ResponseFactory())->createResponse(200)
            ->withHeader('Content-Type', 'application/json; charset=utf-8');
        $response->getBody()->write((string)json_encode([
            'data' => ['ok' => true],
            'meta' => [
                'server_time' => '2026-03-07T00:00:00+00:00',
                'version' => 'v1.0.0',
            ],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return $response;
    }
}

final class ProblemDetailsHandler implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $response = (new ResponseFactory())->createResponse(401)
            ->withHeader('Content-Type', 'application/json; charset=utf-8')
            ->withHeader(TraceContext::CORRELATION_HEADER, 'corr-problem')
            ->withHeader(TraceContext::REQUEST_HEADER, 'corr-problem')
            ->withHeader(TraceContext::SERVER_REQUEST_HEADER, 'srv-problem');
        $response->getBody()->write((string)json_encode([
            'type' => '/errors/unauthorized',
            'status' => 401,
            'title' => 'Unauthorized',
            'detail' => 'Authorization 헤더가 필요합니다.',
            'meta' => [
                'request_id' => 'stale-meta',
                'correlation_id' => 'stale-meta',
                'server_request_id' => 'stale-srv',
            ],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return $response;
    }
}

final class CollectingLogger extends AbstractLogger
{
    /** @var array<string, mixed> */
    public array $context = [];

    /**
     * @param mixed $level
     * @param array<string, mixed> $context
     */
    public function log($level, string|\Stringable $message, array $context = []): void
    {
        $this->context = $context;
    }
}
