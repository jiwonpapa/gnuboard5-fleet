<?php

declare(strict_types=1);

namespace Tests\Core\Plugin;

use Api\Core\Plugin\EventDispatcher;
use Api\Core\Plugin\PluginDiscoveryService;
use Api\Core\Plugin\PluginLoader;
use Api\Core\Plugin\PluginRegistry;
use Api\Core\Plugin\PluginScopePolicy;
use Api\Integration\Contracts\BoardGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Support\Exception\ApiException;
use DI\ContainerBuilder;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use Psr\Log\NullLogger;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;

final class BoardRewardPluginIntegrationTest extends TestCase
{
    protected function tearDown(): void
    {
        unset($_ENV['PLUGIN_BOARD_REWARD_ENABLE_GRANT']);
    }

    public function testBoardRewardBoardLookupUsesBoardReadScope(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $pointGateway = $this->createMock(PointRewardGateway::class);

        $boardGateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_subject' => '자유게시판',
                'gr_id' => 'community',
            ]);

        $pointGateway->expects($this->never())->method('grant');

        $app = $this->bootAppWithGateways($boardGateway, $pointGateway);
        $response = $app->handle($this->request('GET', '/v1/p/board-reward/boards/free'));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame([
            'plugin' => 'board-reward',
            'board' => [
                'bo_table' => 'free',
                'subject' => '자유게시판',
                'group_id' => 'community',
            ],
            'scopes' => ['board.read', 'point.write'],
        ], $this->decodeJsonResponse($response));
    }

    public function testBoardRewardPreviewDoesNotGrantPoints(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $pointGateway = $this->createMock(PointRewardGateway::class);

        $boardGateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_subject' => '자유게시판',
                'gr_id' => 'community',
            ]);

        $pointGateway->expects($this->never())->method('grant');

        $app = $this->bootAppWithGateways($boardGateway, $pointGateway);
        $response = $app->handle($this->request('POST', '/v1/p/board-reward/rewards/preview', [
            'board_id' => 'free',
            'member_id' => 'neo',
            'amount' => 100,
            'reason' => 'plugin demo',
            'rel_id' => 'preview-1',
        ]));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame([
            'plugin' => 'board-reward',
            'mode' => 'preview',
            'grant_enabled' => false,
            'reward' => [
                'board_id' => 'free',
                'member_id' => 'neo',
                'amount' => 100,
                'reason' => 'plugin demo',
                'rel_id' => 'preview-1',
            ],
        ], $this->decodeJsonResponse($response));
    }

    public function testBoardRewardGrantRequiresExplicitEnvToggle(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $pointGateway = $this->createMock(PointRewardGateway::class);

        $boardGateway->expects($this->never())->method('findBoard');

        $pointGateway->expects($this->never())->method('grant');

        $app = $this->bootAppWithGateways($boardGateway, $pointGateway);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('보상 지급 샘플 엔드포인트는 PLUGIN_BOARD_REWARD_ENABLE_GRANT=1 설정 시에만 동작합니다.');

        $app->handle($this->request('POST', '/v1/p/board-reward/rewards/grant', [
            'board_id' => 'free',
            'member_id' => 'neo',
            'amount' => 100,
            'reason' => 'plugin demo',
            'rel_id' => 'grant-1',
        ]));
    }

    public function testBoardRewardGrantCallsPointGatewayWhenEnabled(): void
    {
        $_ENV['PLUGIN_BOARD_REWARD_ENABLE_GRANT'] = '1';

        $boardGateway = $this->createMock(BoardGateway::class);
        $pointGateway = $this->createMock(PointRewardGateway::class);

        $boardGateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_subject' => '자유게시판',
                'gr_id' => 'community',
            ]);

        $pointGateway->expects($this->once())
            ->method('grant')
            ->with('neo', 100, 'plugin demo', 'plugin_board_reward', 'grant-1', 'grant', null);

        $app = $this->bootAppWithGateways($boardGateway, $pointGateway);
        $response = $app->handle($this->request('POST', '/v1/p/board-reward/rewards/grant', [
            'board_id' => 'free',
            'member_id' => 'neo',
            'amount' => 100,
            'reason' => 'plugin demo',
            'rel_id' => 'grant-1',
        ]));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame([
            'plugin' => 'board-reward',
            'mode' => 'grant',
            'status' => 'granted',
            'reward' => [
                'board_id' => 'free',
                'member_id' => 'neo',
                'amount' => 100,
                'reason' => 'plugin demo',
                'rel_id' => 'grant-1',
            ],
        ], $this->decodeJsonResponse($response));
    }

    private function bootAppWithGateways(BoardGateway $boardGateway, PointRewardGateway $pointGateway): \Slim\App
    {
        $builder = new ContainerBuilder();
        $builder->addDefinitions([
            BoardGateway::class => $boardGateway,
            PointRewardGateway::class => $pointGateway,
        ]);

        $logger = new NullLogger();
        $registry = new PluginRegistry();
        $scopePolicy = new PluginScopePolicy();
        $loader = new PluginLoader(
            $logger,
            $registry,
            dirname(__DIR__, 3) . '/api/plugins',
            $scopePolicy,
            new PluginDiscoveryService($logger, $scopePolicy, PluginLoader::API_VERSION),
            null
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
