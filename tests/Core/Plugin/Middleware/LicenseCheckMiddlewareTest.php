<?php

declare(strict_types=1);

namespace Tests\Core\Plugin\Middleware;

use Api\Core\Plugin\Middleware\LicenseCheckMiddleware;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Response;

final class LicenseCheckMiddlewareTest extends TestCase
{
    protected function tearDown(): void
    {
        unset($_ENV['PLUGIN_HELLO_LICENSE']);
        unset($_ENV['PLUGIN_PREMIUM_PUSH_LICENSE']);
    }

    public function testThrowsWhenLicenseKeyIsMissing(): void
    {
        $middleware = new LicenseCheckMiddleware('https://license.example.com/verify', 'hello');

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage("플러그인 'hello'의 유효한 라이선스가 필요합니다.");

        $middleware->process($this->request('/v1/p/hello/greet'), new OkHandler());
    }

    public function testAllowsRequestWhenVerifierReturnsTrue(): void
    {
        $_ENV['PLUGIN_HELLO_LICENSE'] = 'valid-key';
        $middleware = new LicenseCheckMiddleware(
            'https://license.example.com/verify',
            'hello',
            [],
            static fn (string $licenseKey): bool => $licenseKey === 'valid-key'
        );

        $response = $middleware->process($this->request('/v1/p/hello/greet'), new OkHandler());

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testRejectsRequestWhenVerifierReturnsFalse(): void
    {
        $_ENV['PLUGIN_PREMIUM_PUSH_LICENSE'] = 'invalid-key';
        $middleware = new LicenseCheckMiddleware(
            'https://license.example.com/verify',
            'premium-push',
            [],
            static fn (): bool => false
        );

        $this->expectException(ApiException::class);
        $middleware->process($this->request('/api/v1/p/premium-push/send'), new OkHandler());
    }

    public function testSkipsUnrelatedRoute(): void
    {
        $middleware = new LicenseCheckMiddleware('https://license.example.com/verify', 'hello');
        $response = $middleware->process($this->request('/v1/boards/free'), new OkHandler());

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testProtectedPathsAllowFreemiumPluginRoute(): void
    {
        $middleware = new LicenseCheckMiddleware(
            'https://license.example.com/verify',
            'premium-push',
            ['/send']
        );

        $response = $middleware->process($this->request('/api/v1/p/premium-push/status'), new OkHandler());

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testProtectedPathsStillBlockConfiguredPremiumRoute(): void
    {
        $middleware = new LicenseCheckMiddleware(
            'https://license.example.com/verify',
            'premium-push',
            ['/send']
        );

        $this->expectException(ApiException::class);
        $middleware->process($this->request('/api/v1/p/premium-push/send'), new OkHandler());
    }

    private function request(string $path): ServerRequestInterface
    {
        return (new ServerRequestFactory())->createServerRequest('GET', $path);
    }
}

final class OkHandler implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        return new Response(200);
    }
}
