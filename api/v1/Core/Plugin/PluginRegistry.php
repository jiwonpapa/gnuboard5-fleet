<?php

/**
 * PluginRegistry API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Plugin
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Plugin;

final class PluginRegistry
{
    /** @var array<string, array{name:string,vendor:string,version:string,scopes:array<int, string>,status:string}> */
    private array $plugins = [];

    public function clear(): void
    {
        $this->plugins = [];
    }

    /**
     * @param array<string, mixed> $manifest
     */
    public function upsert(array $manifest, string $status): void
    {
        $vendor = trim((string)($manifest['vendor'] ?? ''));
        $name = trim((string)($manifest['name'] ?? ''));
        if ($vendor === '' || $name === '') {
            return;
        }

        $scopes = array_values(
            array_filter(
                array_map(
                    static fn (mixed $scope): string => is_string($scope) ? trim($scope) : '',
                    is_array($manifest['scopes'] ?? null) ? $manifest['scopes'] : []
                ),
                static fn (string $scope): bool => $scope !== ''
            )
        );

        $this->plugins[$this->key($vendor, $name)] = [
            'name' => $name,
            'vendor' => $vendor,
            'version' => trim((string)($manifest['version'] ?? '')),
            'scopes' => $scopes,
            'status' => $status,
        ];
    }

    /**
     * @return array<int, array{name:string,vendor:string,version:string,scopes:array<int, string>,status:string}>
     */
    public function getAll(): array
    {
        $plugins = array_values($this->plugins);
        usort(
            $plugins,
            static fn (array $left, array $right): int => [$left['vendor'], $left['name']] <=> [$right['vendor'], $right['name']]
        );

        return $plugins;
    }

    /**
     * @return array{name:string,vendor:string,version:string,scopes:array<int, string>,status:string}|null
     */
    public function get(string $vendorName, string $pluginName): ?array
    {
        return $this->plugins[$this->key($vendorName, $pluginName)] ?? null;
    }

    public function isLoaded(string $vendorName, string $pluginName): bool
    {
        $plugin = $this->get($vendorName, $pluginName);

        return $plugin !== null && in_array($plugin['status'], ['registered', 'booted'], true);
    }

    private function key(string $vendorName, string $pluginName): string
    {
        return strtolower(trim($vendorName)) . '/' . strtolower(trim($pluginName));
    }
}
