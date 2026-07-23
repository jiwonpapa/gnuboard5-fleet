<?php

declare(strict_types=1);

namespace Tests\Core\Plugin;

use Api\Core\Plugin\EventDispatcher;
use Api\Core\Plugin\Middleware\LicenseCheckMiddleware;
use Api\Core\Plugin\PluginDiscoveryService;
use Api\Core\Plugin\PluginLoader;
use Api\Core\Plugin\PluginRegistry;
use Api\Core\Plugin\PluginScopePolicy;
use Api\Support\Exception\ApiException;
use DI\ContainerBuilder;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;

final class SamplePluginIntegrationTest extends TestCase
{
    protected function tearDown(): void
    {
        unset($_ENV['PLUGIN_PREMIUM_PUSH_LICENSE']);

        if (function_exists('apcu_delete')) {
            apcu_delete('plugin_license_premium-push');
        }
    }

    public function testHelloPluginRoutesReturnExpectedPayloads(): void
    {
        $app = $this->bootSamplePluginApp();

        $greetResponse = $app->handle($this->request('GET', '/v1/p/hello/greet'));
        $infoResponse = $app->handle($this->request('GET', '/v1/p/hello/info'));

        $this->assertSame(200, $greetResponse->getStatusCode());
        $this->assertSame([
            'message' => 'Hello from HelloPlugin!',
            'version' => '1.0.0',
        ], $this->decodeJsonResponse($greetResponse));

        $this->assertSame(200, $infoResponse->getStatusCode());
        $this->assertSame([
            'plugin' => 'hello',
            'vendor' => 'wolchuck',
            'api_version' => '1.1.0',
        ], $this->decodeJsonResponse($infoResponse));
    }

    public function testPremiumPushAllowsFreeStatusRouteWithoutLicense(): void
    {
        $app = $this->bootSamplePluginApp();

        $response = $app->handle($this->request('GET', '/v1/p/premium-push/status'));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame([
            'plugin' => 'premium-push',
            'status' => 'ready',
            'license_required_for' => ['/send'],
        ], $this->decodeJsonResponse($response));
    }

    public function testPremiumPushBlocksProtectedRouteWithoutLicense(): void
    {
        $app = $this->bootSamplePluginApp();

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage("플러그인 'premium-push'의 유효한 라이선스가 필요합니다.");

        $app->handle($this->request('POST', '/v1/p/premium-push/send', [
            'target' => 'demo-user',
            'message' => 'blocked',
        ]));
    }

    public function testPremiumPushSendRouteWorksWithValidLicense(): void
    {
        $_ENV['PLUGIN_PREMIUM_PUSH_LICENSE'] = 'valid-key';

        if (function_exists('apcu_delete')) {
            apcu_delete('plugin_license_premium-push');
        }

        $app = $this->bootSamplePluginApp();
        $response = $app->handle($this->request('POST', '/v1/p/premium-push/send', [
            'target' => 'member-1',
            'message' => 'hello premium',
        ]));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame([
            'status' => 'sent',
            'target' => 'member-1',
            'message' => 'hello premium',
        ], $this->decodeJsonResponse($response));
    }

    private function bootSamplePluginApp(): \Slim\App
    {
        $builder = new ContainerBuilder();
        $logger = new NullLogger();
        $registry = new PluginRegistry();
        $scopePolicy = new PluginScopePolicy();
        $loader = new PluginLoader(
            $logger,
            $registry,
            dirname(__DIR__, 3) . '/api/plugins',
            $scopePolicy,
            new PluginDiscoveryService($logger, $scopePolicy, PluginLoader::API_VERSION),
            static fn (string $checkUrl, string $pluginName, array $protectedPaths): LicenseCheckMiddleware
                => new LicenseCheckMiddleware(
                    $checkUrl,
                    $pluginName,
                    $protectedPaths,
                    static fn (string $licenseKey): bool => $licenseKey === 'valid-key'
                )
        );

        $loader->registerAll($builder);

        $container = $builder->build();
        AppFactory::setContainer($container);

        $app = AppFactory::create();
        $loader->bootAll($app, new EventDispatcher());

        return $app;
    }

    /**
     * @param array<string, mixed>|null $payload
     */
    private function request(string $method, string $path, ?array $payload = null): \Psr\Http\Message\ServerRequestInterface
    {
        $request = (new ServerRequestFactory())->createServerRequest($method, $path);

        if ($payload === null) {
            return $request;
        }

        $request->getBody()->write((string)json_encode($payload, JSON_UNESCAPED_UNICODE));
        $request->getBody()->rewind();

        return $request->withHeader('Content-Type', 'application/json');
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeJsonResponse(\Psr\Http\Message\ResponseInterface $response): array
    {
        $decoded = json_decode((string)$response->getBody(), true);

        self::assertIsArray($decoded);

        return $decoded;
    }
}
