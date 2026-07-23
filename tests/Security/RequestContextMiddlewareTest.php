<?php

declare(strict_types=1);

namespace Tests\Security;

use Api\Middlewares\RequestContextMiddleware;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Response;

final class RequestContextMiddlewareTest extends TestCase
{
    protected function tearDown(): void
    {
        unset($_ENV['TRUST_PROXY_HEADERS'], $_ENV['TRUSTED_PROXIES']);
    }

    public function testUsesRemoteAddrWhenProxyTrustDisabled(): void
    {
        $_ENV['TRUST_PROXY_HEADERS'] = 'false';
        $_ENV['TRUSTED_PROXIES'] = '127.0.0.1';

        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/v1/health', ['REMOTE_ADDR' => '10.0.0.5'])
            ->withHeader('X-Forwarded-For', '203.0.113.9');

        $handler = new CapturingRequestHandler();
        (new RequestContextMiddleware())->process($request, $handler);

        $this->assertSame('10.0.0.5', $handler->capturedRequest?->getAttribute('client_ip'));
    }

    public function testUsesRemoteAddrWhenCallerIsNotTrustedProxy(): void
    {
        $_ENV['TRUST_PROXY_HEADERS'] = 'true';
        $_ENV['TRUSTED_PROXIES'] = '127.0.0.1,::1';

        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/v1/health', ['REMOTE_ADDR' => '10.0.0.5'])
            ->withHeader('X-Forwarded-For', '203.0.113.9');

        $handler = new CapturingRequestHandler();
        (new RequestContextMiddleware())->process($request, $handler);

        $this->assertSame('10.0.0.5', $handler->capturedRequest?->getAttribute('client_ip'));
    }

    public function testUsesForwardedForWhenCallerIsTrustedProxy(): void
    {
        $_ENV['TRUST_PROXY_HEADERS'] = 'true';
        $_ENV['TRUSTED_PROXIES'] = '10.0.0.5';

        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/v1/health', ['REMOTE_ADDR' => '10.0.0.5'])
            ->withHeader('X-Forwarded-For', '203.0.113.9, 10.0.0.5');

        $handler = new CapturingRequestHandler();
        (new RequestContextMiddleware())->process($request, $handler);

        $this->assertSame('203.0.113.9', $handler->capturedRequest?->getAttribute('client_ip'));
    }

    public function testFallsBackToRemoteAddrOnInvalidForwardedIp(): void
    {
        $_ENV['TRUST_PROXY_HEADERS'] = 'true';
        $_ENV['TRUSTED_PROXIES'] = '10.0.0.5';

        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/v1/health', ['REMOTE_ADDR' => '10.0.0.5'])
            ->withHeader('X-Forwarded-For', 'not-an-ip');

        $handler = new CapturingRequestHandler();
        (new RequestContextMiddleware())->process($request, $handler);

        $this->assertSame('10.0.0.5', $handler->capturedRequest?->getAttribute('client_ip'));
    }

    public function testPreservesIncomingCorrelationIdAndGeneratesServerRequestId(): void
    {
        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/v1/health', ['REMOTE_ADDR' => '10.0.0.5'])
            ->withHeader('X-Correlation-Id', 'corr-123');

        $handler = new CapturingRequestHandler();
        (new RequestContextMiddleware())->process($request, $handler);

        $captured = $handler->capturedRequest;
        $this->assertSame('corr-123', $captured?->getAttribute('correlation_id'));
        $this->assertSame('corr-123', $captured?->getAttribute('request_id'));
        $this->assertSame('corr-123', $captured?->getHeaderLine('X-Correlation-Id'));
        $this->assertSame('corr-123', $captured?->getHeaderLine('X-Request-Id'));
        $this->assertMatchesRegularExpression(
            '/^[a-f0-9]{32}$/',
            (string)$captured?->getAttribute('server_request_id')
        );
        $this->assertIsFloat($captured?->getAttribute('request_started_at'));
    }
}

final class CapturingRequestHandler implements RequestHandlerInterface
{
    public ?ServerRequestInterface $capturedRequest = null;

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $this->capturedRequest = $request;
        return new Response(200);
    }
}
