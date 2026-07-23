<?php

/**
 * PluginScopedContainer API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Plugin
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Plugin;

use Api\Core\Plugin\Gateway\MemberGatewayProxy;
use Api\Core\Plugin\Gateway\PostGatewayProxy;
use Api\Integration\Contracts\BoardGateway;
use Api\Integration\Contracts\MemberGateway;
use Api\Integration\Contracts\PostGateway;
use DI\NotFoundException;
use Psr\Container\ContainerInterface;

final class PluginScopedContainer implements ContainerInterface
{
    /**
     * @var array<string, string>
     */
    private readonly array $permissions;

    /**
     * @var array<string, mixed>
     */
    private array $resolved = [];

    private readonly string $pluginId;
    private readonly PluginScopePolicy $scopePolicy;

    /**
     * @param array<string, mixed> $manifest
     */
    public function __construct(
        private readonly ContainerInterface $rootContainer,
        array $manifest,
        PluginScopePolicy $scopePolicy
    ) {
        $this->scopePolicy = $scopePolicy;
        $this->permissions = $this->scopePolicy->permissionsFor(is_array($manifest['scopes'] ?? null) ? $manifest['scopes'] : []);
        $vendor = trim((string)($manifest['vendor'] ?? ''));
        $name = trim((string)($manifest['name'] ?? ''));
        $this->pluginId = strtolower($vendor . '/' . $name);
    }

    public function get(string $id): mixed
    {
        if (array_key_exists($id, $this->resolved)) {
            return $this->resolved[$id];
        }

        $permission = $this->permissions[$id] ?? null;
        if ($permission === null) {
            throw PluginScopeViolationException::forService($this->pluginId, $id);
        }

        if (!$this->rootContainer->has($id)) {
            throw new NotFoundException(sprintf("No entry or class found for '%s'", $id));
        }

        $service = $this->rootContainer->get($id);
        $service = $this->decorate($id, $service, $permission);
        $this->resolved[$id] = $service;

        return $service;
    }

    public function has(string $id): bool
    {
        if (isset($this->permissions[$id])) {
            return $this->rootContainer->has($id);
        }

        if ($this->scopePolicy->isKnownGateway($id)) {
            return $this->rootContainer->has($id);
        }

        return false;
    }

    private function decorate(string $id, mixed $service, string $permission): mixed
    {
        if ($permission === PluginScopePolicy::ACCESS_FULL) {
            return $service;
        }

        return match ($id) {
            MemberGateway::class => new MemberGatewayProxy($this->assertService($service, MemberGateway::class), $this->pluginId, false),
            PostGateway::class => new PostGatewayProxy($this->assertService($service, PostGateway::class), $this->pluginId, false),
            BoardGateway::class => $this->assertService($service, BoardGateway::class),
            default => $service,
        };
    }

    /**
     * @template T of object
     * @param class-string<T> $serviceId
     * @return T
     */
    private function assertService(mixed $service, string $serviceId): object
    {
        if (!is_object($service) || !$service instanceof $serviceId) {
            throw new \RuntimeException(sprintf("Plugin service '%s' is not available.", $serviceId));
        }

        return $service;
    }
}
