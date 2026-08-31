<?php

declare(strict_types=1);

namespace Api\Admin\System\Service\Support;

use Api\Core\Config\EnvConfig;
use Api\Support\Exception\ApiException;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

final class AdminSystemMaintenanceContext
{
    public function __construct(
        private readonly ?string $projectRoot = null,
        private readonly ?string $dataPath = null
    ) {
    }

    public function projectRoot(): string
    {
        return rtrim($this->projectRoot ?? dirname(__DIR__, 6), '/');
    }

    public function dataPath(): string
    {
        return rtrim($this->dataPath ?? EnvConfig::fromEnv()->dataPath, '/');
    }

    public function browscapPluginPath(): string
    {
        return $this->projectRoot() . '/plugin/browscap/Browscap.php';
    }

    public function browscapCacheFile(): string
    {
        return $this->dataPath() . '/cache/browscap_cache.php';
    }

    public function ensureDirectory(string $path): void
    {
        if (is_dir($path)) {
            return;
        }

        if (!@mkdir($path, 0775, true) && !is_dir($path)) {
            throw ApiException::serverError('디렉토리를 생성할 수 없습니다: ' . $path);
        }
    }

    /**
     * @return list<string>
     */
    public function globList(string $pattern): array
    {
        $items = glob($pattern);

        return is_array($items) ? array_values($items) : [];
    }

    public function deleteDirectoryTree(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $item) {
            if ($item->isDir()) {
                @rmdir($item->getPathname());
                continue;
            }

            @unlink($item->getPathname());
        }

        @rmdir($path);
    }
}
