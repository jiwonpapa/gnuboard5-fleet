<?php

/**
 * PluginLoader API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Plugin
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Plugin;

use Api\Core\Plugin\Middleware\LicenseCheckMiddleware;
use Closure;
use DI\Container;
use DI\ContainerBuilder;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;
use Slim\App;
use Throwable;

final class PluginLoader
{
    public const API_VERSION = '1.1.0';

    /** @var list<array{plugin: PluginInterface, manifest: array<string, mixed>, builder: ContainerBuilder<Container>}> */
    private array $loaded = [];

    private readonly ?Closure $licenseMiddlewareFactory;
    private readonly PluginDiscoveryService $discoveryService;
    private readonly PluginRegistry $registry;
    private readonly PluginScopePolicy $scopePolicy;

    public function __construct(
        private readonly LoggerInterface $logger,
        PluginRegistry $registry,
        private readonly string $pluginRoot,
        PluginScopePolicy $scopePolicy,
        PluginDiscoveryService $discoveryService,
        ?callable $licenseMiddlewareFactory = null
    ) {
        $this->registry = $registry;
        $this->licenseMiddlewareFactory = $licenseMiddlewareFactory !== null
            ? Closure::fromCallable($licenseMiddlewareFactory)
            : null;
        $this->scopePolicy = $scopePolicy;
        $this->discoveryService = $discoveryService;
    }

    /**
     * @param ContainerBuilder<\DI\Container> $builder
     */
    public function registerAll(ContainerBuilder $builder): void
    {
        unset($builder);

        $this->loaded = [];
        $this->registry->clear();

        foreach ($this->discoveryService->discover($this->pluginRoot) as $entry) {
            $pluginBuilder = new ContainerBuilder();
            $pluginBuilder->useAutowiring(false);

            try {
                $entry['plugin']->register($pluginBuilder);
                $entry['builder'] = $pluginBuilder;
                $this->loaded[] = $entry;
                $this->registry->upsert($entry['manifest'], 'registered');
                $this->logger->info(
                    sprintf(
                        'Plugin registered: %s/%s',
                        (string)$entry['manifest']['vendor'],
                        (string)$entry['manifest']['name']
                    )
                );
            } catch (Throwable $exception) {
                $this->logger->error(
                    sprintf(
                        'Plugin register failed: %s/%s',
                        (string)$entry['manifest']['vendor'],
                        (string)$entry['manifest']['name']
                    ),
                    ['exception' => $exception]
                );
            }
        }
    }

    /**
     * @param App<\Psr\Container\ContainerInterface|null> $app
     */
    public function bootAll(App $app, EventDispatcher $events): void
    {
        $rootContainer = $app->getContainer();
        if (!$rootContainer instanceof ContainerInterface) {
            throw new \RuntimeException('Application container is required to boot plugins.');
        }

        foreach ($this->loaded as $entry) {
            try {
                $pluginContainer = $this->buildPluginContainer($entry['builder'], $entry['manifest'], $rootContainer);
                $context = new PluginContext($entry['manifest'], $pluginContainer);

                if ($pluginContainer instanceof Container) {
                    $pluginContainer->set(PluginContext::class, $context);
                }

                $entry['plugin']->boot($app, $events, $context);
                $this->attachLicenseMiddleware($app, $entry['manifest']);
                $this->registry->upsert($entry['manifest'], 'booted');
                $this->logger->info(
                    sprintf(
                        'Plugin booted: %s/%s',
                        (string)$entry['manifest']['vendor'],
                        (string)$entry['manifest']['name']
                    )
                );
            } catch (Throwable $exception) {
                $this->registry->upsert($entry['manifest'], 'boot_failed');
                $this->logger->error(
                    sprintf(
                        'Plugin boot failed: %s/%s',
                        (string)$entry['manifest']['vendor'],
                        (string)$entry['manifest']['name']
                    ),
                    ['exception' => $exception]
                );
            }
        }
    }

    public function registry(): PluginRegistry
    {
        return $this->registry;
    }

    /**
     * @param ContainerBuilder<Container> $builder
     * @param array<string, mixed> $manifest
     */
    private function buildPluginContainer(
        ContainerBuilder $builder,
        array $manifest,
        ContainerInterface $rootContainer
    ): ContainerInterface {
        $container = $builder->build();
        if (!$container instanceof Container) {
            return $container;
        }

        $scopedContainer = new PluginScopedContainer($rootContainer, $manifest, $this->scopePolicy);
        foreach ($this->scopePolicy->permissionsFor(is_array($manifest['scopes'] ?? null) ? $manifest['scopes'] : []) as $serviceId => $permission) {
            unset($permission);

            if (!$scopedContainer->has($serviceId)) {
                continue;
            }

            $container->set($serviceId, $scopedContainer->get($serviceId));
        }

        $container->set(
            LoggerInterface::class,
            $rootContainer->has(LoggerInterface::class)
                ? $rootContainer->get(LoggerInterface::class)
                : $this->logger
        );

        return $container;
    }

    /**
     * @param array<string, mixed> $manifest
     * @param App<\Psr\Container\ContainerInterface|null> $app
     */
    private function attachLicenseMiddleware(App $app, array $manifest): void
    {
        $license = $manifest['license'] ?? null;
        if (!is_array($license)) {
            return;
        }

        $type = strtolower(trim((string)($license['type'] ?? 'free')));
        $checkUrl = trim((string)($license['check_url'] ?? ''));
        if ($type !== 'commercial') {
            return;
        }

        if ($checkUrl === '') {
            $this->logger->warning(
                'Commercial plugin missing license check URL.',
                ['plugin' => (string)$manifest['name']]
            );

            return;
        }

        $protectedPaths = is_array($license['protected_paths'] ?? null)
            ? array_values($license['protected_paths'])
            : [];

        if ($this->licenseMiddlewareFactory instanceof Closure) {
            $app->add(($this->licenseMiddlewareFactory)($checkUrl, (string)$manifest['name'], $protectedPaths));

            return;
        }

        $app->add(new LicenseCheckMiddleware($checkUrl, (string)$manifest['name'], $protectedPaths));
    }

}
