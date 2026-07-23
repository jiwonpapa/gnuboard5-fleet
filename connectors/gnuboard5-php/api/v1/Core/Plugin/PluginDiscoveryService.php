<?php

declare(strict_types=1);

namespace Api\Core\Plugin;

use JsonException;
use Psr\Log\LoggerInterface;

final class PluginDiscoveryService
{
    /** @var array<string, true> */
    private array $autoloaders = [];

    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly PluginScopePolicy $scopePolicy,
        private readonly string $apiVersion
    ) {
    }

    /**
     * @return \Generator<int, array{plugin: PluginInterface, manifest: array<string, mixed>}>
     */
    public function discover(string $pluginRoot): \Generator
    {
        if (!is_dir($pluginRoot)) {
            return;
        }

        $vendorDirs = glob($pluginRoot . '/*', GLOB_ONLYDIR);
        if (!is_array($vendorDirs)) {
            return;
        }

        foreach ($vendorDirs as $vendorDir) {
            $pluginDirs = glob($vendorDir . '/*', GLOB_ONLYDIR);
            if (!is_array($pluginDirs)) {
                continue;
            }

            foreach ($pluginDirs as $pluginDir) {
                $entry = $this->loadPlugin($pluginDir);
                if ($entry !== null) {
                    yield $entry;
                }
            }
        }
    }

    /**
     * @return array{plugin: PluginInterface, manifest: array<string, mixed>}|null
     */
    private function loadPlugin(string $pluginDir): ?array
    {
        $manifestPath = $pluginDir . '/manifest.json';
        $pluginPath = $pluginDir . '/Plugin.php';

        if (!is_file($manifestPath)) {
            $this->logger->warning('Plugin manifest missing.', ['dir' => $pluginDir]);

            return null;
        }

        if (!is_file($pluginPath)) {
            $this->logger->warning('Plugin entry file missing.', ['dir' => $pluginDir]);

            return null;
        }

        $manifest = $this->parseManifest($manifestPath);
        if ($manifest === null) {
            return null;
        }

        if (!$this->isManifestValid($manifest, $manifestPath)) {
            return null;
        }

        if (!$this->satisfiesVersion($this->apiVersion, (string)$manifest['require_api_version'])) {
            $this->logger->warning(
                'Plugin API version mismatch.',
                [
                    'plugin' => (string)$manifest['name'],
                    'required' => (string)$manifest['require_api_version'],
                    'current' => $this->apiVersion,
                ]
            );

            return null;
        }

        $this->registerManifestAutoloaders($manifest, $pluginDir);

        require_once $pluginPath;

        $entryClass = $this->resolveEntryClass($manifest);
        if (!class_exists($entryClass) || !is_subclass_of($entryClass, PluginInterface::class)) {
            $this->logger->warning(
                'Plugin entry class is invalid.',
                [
                    'plugin' => (string)$manifest['name'],
                    'class' => $entryClass,
                ]
            );

            return null;
        }

        /** @var PluginInterface $plugin */
        $plugin = new $entryClass();

        return [
            'plugin' => $plugin,
            'manifest' => $manifest,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function parseManifest(string $manifestPath): ?array
    {
        try {
            $decoded = json_decode((string)file_get_contents($manifestPath), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            $this->logger->warning('Plugin manifest is not valid JSON.', ['manifest' => $manifestPath]);

            return null;
        }

        if (!is_array($decoded)) {
            $this->logger->warning('Plugin manifest must decode to an object.', ['manifest' => $manifestPath]);

            return null;
        }

        return $decoded;
    }

    /**
     * @param array<string, mixed> $manifest
     */
    private function isManifestValid(array $manifest, string $manifestPath): bool
    {
        foreach (['name', 'vendor', 'version', 'require_api_version'] as $field) {
            if (trim((string)($manifest[$field] ?? '')) === '') {
                $this->logger->warning('Plugin manifest missing required field.', [
                    'manifest' => $manifestPath,
                    'field' => $field,
                ]);

                return false;
            }
        }

        if (!is_array($manifest['scopes'] ?? null)) {
            $this->logger->warning('Plugin manifest scopes must be an array.', ['manifest' => $manifestPath]);

            return false;
        }

        $unsupportedScopes = $this->scopePolicy->unsupportedScopes($manifest['scopes']);
        if ($unsupportedScopes !== []) {
            $this->logger->warning('Plugin manifest contains unsupported scopes.', [
                'manifest' => $manifestPath,
                'scopes' => $unsupportedScopes,
            ]);

            return false;
        }

        return true;
    }

    /**
     * @param array<string, mixed> $manifest
     */
    private function registerManifestAutoloaders(array $manifest, string $pluginDir): void
    {
        $psr4 = $manifest['autoload']['psr-4'] ?? null;
        if (!is_array($psr4)) {
            return;
        }

        foreach ($psr4 as $prefix => $relativePath) {
            if (!is_string($prefix) || trim($prefix) === '' || !is_string($relativePath) || trim($relativePath) === '') {
                continue;
            }

            $baseDir = rtrim($pluginDir . '/' . trim($relativePath, '/'), '/');
            $autoloadKey = $prefix . '|' . $baseDir;
            if (isset($this->autoloaders[$autoloadKey])) {
                continue;
            }

            spl_autoload_register(
                static function (string $class) use ($prefix, $baseDir): void {
                    if (!str_starts_with($class, $prefix)) {
                        return;
                    }

                    $relativeClass = substr($class, strlen($prefix));
                    if ($relativeClass === '') {
                        return;
                    }

                    $file = $baseDir . '/' . str_replace('\\', '/', $relativeClass) . '.php';
                    if (is_file($file)) {
                        require_once $file;
                    }
                }
            );

            $this->autoloaders[$autoloadKey] = true;
        }
    }

    /**
     * @param array<string, mixed> $manifest
     */
    private function resolveEntryClass(array $manifest): string
    {
        $entryClass = trim((string)($manifest['entry_class'] ?? 'Plugin'));
        if (str_contains($entryClass, '\\')) {
            return ltrim($entryClass, '\\');
        }

        $psr4 = $manifest['autoload']['psr-4'] ?? null;
        if (is_array($psr4) && $psr4 !== []) {
            $prefix = array_key_first($psr4);
            if (is_string($prefix) && trim($prefix) !== '') {
                return rtrim($prefix, '\\') . '\\' . $entryClass;
            }
        }

        return $entryClass;
    }

    private function satisfiesVersion(string $current, string $constraint): bool
    {
        $normalized = trim($constraint);
        if ($normalized === '') {
            return true;
        }

        if (str_starts_with($normalized, '>=')) {
            return version_compare($current, substr($normalized, 2), '>=');
        }

        if (str_starts_with($normalized, '>')) {
            return version_compare($current, substr($normalized, 1), '>');
        }

        if (str_starts_with($normalized, '<=')) {
            return version_compare($current, substr($normalized, 2), '<=');
        }

        if (str_starts_with($normalized, '<')) {
            return version_compare($current, substr($normalized, 1), '<');
        }

        if (str_starts_with($normalized, '=')) {
            return version_compare($current, substr($normalized, 1), '=');
        }

        return version_compare($current, $normalized, '>=');
    }
}
