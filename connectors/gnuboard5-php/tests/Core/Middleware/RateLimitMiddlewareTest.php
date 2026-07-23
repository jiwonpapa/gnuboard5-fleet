<?php

declare(strict_types=1);

namespace Tests\Core\Middleware;

use Api\Core\Middleware\RateLimitMiddleware;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Response;

final class RateLimitMiddlewareTest extends TestCase
{
    private string $storagePath;

    protected function setUp(): void
    {
        $this->storagePath = sys_get_temp_dir() . '/g5-rate-limit-test-' . bin2hex(random_bytes(6));
    }

    protected function tearDown(): void
    {
        if (is_dir($this->storagePath)) {
            $files = glob($this->storagePath . '/*');
            if (is_array($files)) {
                foreach ($files as $file) {
                    @unlink($file);
                }
            }
            @rmdir($this->storagePath);
        }
    }

    public function testAddsRateLimitHeadersOnSuccess(): void
    {
        $middleware = new RateLimitMiddleware(
            storagePath: $this->storagePath,
            enabled: true,
            guestLimitPerMinute: 2,
            authLimitPerMinute: 3,
            loginLimit: 1,
            loginWindowSeconds: 300
        );

        $response = $middleware->process($this->request('/v1/boards/free', '10.0.0.1'), new OkHandler());

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('2', $response->getHeaderLine('X-RateLimit-Limit'));
        $this->assertSame('1', $response->getHeaderLine('X-RateLimit-Remaining'));
        $this->assertNotSame('', $response->getHeaderLine('X-RateLimit-Reset'));
    }

    public function testReturns429WhenLimitExceeded(): void
    {
        $middleware = new RateLimitMiddleware(
            storagePath: $this->storagePath,
            enabled: true,
            guestLimitPerMinute: 1,
            authLimitPerMinute: 2,
            loginLimit: 1,
            loginWindowSeconds: 300
        );

        $request = $this->request('/v1/boards/free', '10.0.0.2');
        $this->assertSame(200, $middleware->process($request, new OkHandler())->getStatusCode());

        $blocked = $middleware->process($request, new OkHandler());
        $this->assertSame(429, $blocked->getStatusCode());
        $this->assertSame('1', $blocked->getHeaderLine('X-RateLimit-Limit'));
        $this->assertSame('0', $blocked->getHeaderLine('X-RateLimit-Remaining'));
        $this->assertNotSame('', $blocked->getHeaderLine('Retry-After'));
    }

    public function testAppliesStricterLoginPolicy(): void
    {
        $middleware = new RateLimitMiddleware(
            storagePath: $this->storagePath,
            enabled: true,
            guestLimitPerMinute: 60,
            authLimitPerMinute: 120,
            loginLimit: 1,
            loginWindowSeconds: 300
        );

        $request = $this->request('/v1/auth/login', '10.0.0.3');
        $this->assertSame(200, $middleware->process($request, new OkHandler())->getStatusCode());

        $blocked = $middleware->process($request, new OkHandler());
        $this->assertSame(429, $blocked->getStatusCode());
        $this->assertSame('1', $blocked->getHeaderLine('X-RateLimit-Limit'));
    }

    public function testAuthenticatedRequestUsesAuthLimit(): void
    {
        $middleware = new RateLimitMiddleware(
            storagePath: $this->storagePath,
            enabled: true,
            guestLimitPerMinute: 1,
            authLimitPerMinute: 2,
            loginLimit: 1,
            loginWindowSeconds: 300
        );

        $request = $this->request('/v1/boards/free', '10.0.0.4')
            ->withHeader('Authorization', 'Bearer test-token');

        $this->assertSame(200, $middleware->process($request, new OkHandler())->getStatusCode());
        $this->assertSame(200, $middleware->process($request, new OkHandler())->getStatusCode());
        $this->assertSame(429, $middleware->process($request, new OkHandler())->getStatusCode());
    }

    private function request(string $path, string $ip): ServerRequestInterface
    {
        return (new ServerRequestFactory())
            ->createServerRequest('GET', $path, ['REMOTE_ADDR' => $ip])
            ->withAttribute('client_ip', $ip);
    }
}

final class OkHandler implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        return new Response(200);
    }
}
