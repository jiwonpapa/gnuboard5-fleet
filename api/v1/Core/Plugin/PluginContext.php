<?php

/**
 * PluginContext API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Plugin
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Plugin;

use Psr\Container\ContainerInterface;

final class PluginContext
{
    /**
     * @param array<string, mixed> $manifest
     */
    public function __construct(
        private readonly array $manifest,
        private readonly ContainerInterface $container
    ) {
    }

    public function vendor(): string
    {
        return trim((string)($this->manifest['vendor'] ?? ''));
    }

    public function name(): string
    {
        return trim((string)($this->manifest['name'] ?? ''));
    }

    public function id(): string
    {
        return strtolower($this->vendor() . '/' . $this->name());
    }

    public function version(): string
    {
        return trim((string)($this->manifest['version'] ?? ''));
    }

    /**
     * @return array<int, string>
     */
    public function scopes(): array
    {
        return array_values(
            array_filter(
                array_map(
                    static fn (mixed $scope): string => is_string($scope) ? trim($scope) : '',
                    is_array($this->manifest['scopes'] ?? null) ? $this->manifest['scopes'] : []
                ),
                static fn (string $scope): bool => $scope !== ''
            )
        );
    }

    public function hasScope(string $scope): bool
    {
        return in_array(trim($scope), $this->scopes(), true);
    }

    /**
     * @return array<string, mixed>
     */
    public function manifest(): array
    {
        return $this->manifest;
    }

    public function get(string $entryId): mixed
    {
        return $this->container->get($entryId);
    }

    public function callable(string $className, string $method): callable
    {
        if (!class_exists($className) || !method_exists($className, $method)) {
            throw new \RuntimeException(sprintf('Plugin callable method not found: %s::%s', $className, $method));
        }

        $container = $this->container;

        return function (...$arguments) use ($container, $className, $method): mixed {
            $instance = $container->get($className);

            return $instance->{$method}(...$arguments);
        };
    }
}
