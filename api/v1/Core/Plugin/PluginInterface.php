<?php

/**
 * PluginInterface API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Plugin
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Plugin;

use DI\ContainerBuilder;
use Slim\App;

interface PluginInterface
{
    /**
     * @param ContainerBuilder<\DI\Container> $builder
     */
    public function register(ContainerBuilder $builder): void;

    /**
     * @param App<\Psr\Container\ContainerInterface|null> $app
     */
    public function boot(App $app, EventDispatcher $events, PluginContext $context): void;
}
