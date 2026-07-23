<?php

/**
 * Hello plugin API module.
 *
 * @package  Gnuboard5\Api\Plugins\Wolchuck\Hello
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Plugins\Wolchuck\Hello;

use Api\Core\Plugin\EventDispatcher;
use Api\Core\Plugin\PluginContext;
use Api\Core\Plugin\PluginInterface;
use Api\Plugins\Wolchuck\Hello\Controller\HelloController;
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
            HelloController::class => static fn (ContainerInterface $container): HelloController => new HelloController(),
        ]);
    }

    /**
     * @param App<\Psr\Container\ContainerInterface|null> $app
     */
    public function boot(App $app, EventDispatcher $events, PluginContext $context): void
    {
        /** @var LoggerInterface $logger */
        $logger = $context->get(LoggerInterface::class);

        $app->group('/v1/p/hello', function (RouteCollectorProxy $group) use ($context): void {
            $group->get('/greet', $context->callable(HelloController::class, 'greet'));
            $group->get('/info', $context->callable(HelloController::class, 'info'));
        });

        $events->listen('member.registered', static function (array $payload) use ($logger): array {
            $logger->info('[HelloPlugin] member.registered', [
                'member_id' => (string)($payload['member_id'] ?? 'unknown'),
            ]);

            return $payload;
        });
    }
}
