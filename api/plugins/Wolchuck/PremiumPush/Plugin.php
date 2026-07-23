<?php

/**
 * PremiumPush plugin API module.
 *
 * @package  Gnuboard5\Api\Plugins\Wolchuck\PremiumPush
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Plugins\Wolchuck\PremiumPush;

use Api\Core\Plugin\EventDispatcher;
use Api\Core\Plugin\PluginContext;
use Api\Core\Plugin\PluginInterface;
use Api\Plugins\Wolchuck\PremiumPush\Controller\PushController;
use Api\Plugins\Wolchuck\PremiumPush\Service\PushNotificationService;
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
            PushNotificationService::class => static fn (ContainerInterface $container): PushNotificationService => new PushNotificationService(),
            PushController::class => static fn (ContainerInterface $container): PushController => new PushController(
                $container->get(PushNotificationService::class)
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

        $app->group('/v1/p/premium-push', function (RouteCollectorProxy $group) use ($context): void {
            $group->get('/status', $context->callable(PushController::class, 'status'));
            $group->post('/send', $context->callable(PushController::class, 'send'));
            $group->post('/messages', $context->callable(PushController::class, 'send'));
        });

        $events->listen('post.created', static function (array $payload) use ($logger): array {
            $logger->info('[PremiumPush] post.created', [
                'payload' => $payload,
            ]);

            return $payload;
        });
    }
}
