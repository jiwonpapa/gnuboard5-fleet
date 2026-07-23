<?php

/**
 * BoardReward plugin API module.
 *
 * @package  Gnuboard5\Api\Plugins\Wolchuck\BoardReward
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Plugins\Wolchuck\BoardReward;

use Api\Core\Config\EnvConfig;
use Api\Core\Plugin\EventDispatcher;
use Api\Core\Plugin\PluginContext;
use Api\Core\Plugin\PluginInterface;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Plugins\Wolchuck\BoardReward\Controller\BoardRewardController;
use Api\Plugins\Wolchuck\BoardReward\Service\BoardRewardService;
use DI\ContainerBuilder;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

final class Plugin implements PluginInterface
{
    /**
     * @param ContainerBuilder<\DI\Container> $builder
     */
    public function register(ContainerBuilder $builder): void
    {
        $builder->addDefinitions([
            EnvConfig::class => static fn (): EnvConfig => EnvConfig::fromEnv(),
            BoardRewardService::class => static fn (ContainerInterface $container): BoardRewardService => new BoardRewardService(
                $container->get(\Api\Integration\Contracts\BoardGateway::class),
                $container->get(PointRewardGateway::class),
                $container->get(EnvConfig::class)
            ),
            BoardRewardController::class => static fn (ContainerInterface $container): BoardRewardController => new BoardRewardController(
                $container->get(BoardRewardService::class)
            ),
        ]);
    }

    /**
     * @param App<\Psr\Container\ContainerInterface|null> $app
     */
    public function boot(App $app, EventDispatcher $events, PluginContext $context): void
    {
        /** @var LoggerInterface $logger */
        $logger = $context->get(LoggerInterface::class);

        $app->group('/v1/p/board-reward', function (RouteCollectorProxy $group) use ($context): void {
            $group->get('/boards/{bo_table}', $context->callable(BoardRewardController::class, 'showBoard'));
            $group->post('/rewards/preview', $context->callable(BoardRewardController::class, 'previewReward'));
            $group->post('/rewards/grant', $context->callable(BoardRewardController::class, 'grantReward'));
            $group->post('/reward-grants', $context->callable(BoardRewardController::class, 'grantReward'));
        });

        $events->listen('post.created', static function (array $payload) use ($logger): array {
            $logger->info('[BoardReward] post.created observed for manual reward workflow', [
                'payload' => $payload,
            ]);

            return $payload;
        });
    }
}
