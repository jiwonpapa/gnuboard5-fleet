<?php

declare(strict_types=1);

namespace Api\Admin\System\Service;

use Api\Admin\System\Service\Support\AdminSystemMaintenanceContext;
use Api\Admin\System\Service\Support\AdminSystemMaintenanceResultBuilder;

final class AdminSystemStorageMaintenanceService
{
    public function __construct(
        private readonly AdminSystemMaintenanceContext $context,
        private readonly AdminSystemMaintenanceResultBuilder $resultBuilder
    ) {
    }

    /**
     * @return array<string,mixed>
     */
    public function purgeThumbnailFiles(): array
    {
        $roots = [
            $this->context->dataPath() . '/file',
            $this->context->dataPath() . '/editor',
        ];

        $directories = [];
        foreach ($roots as $root) {
            if (!is_dir($root) || !is_readable($root)) {
                continue;
            }

            $entries = scandir($root);
            if (!is_array($entries)) {
                continue;
            }

            foreach ($entries as $entry) {
                if ($entry === '.' || $entry === '..') {
                    continue;
                }

                $path = $root . '/' . $entry;
                if (is_dir($path)) {
                    $directories[] = $path;
                }
            }
        }

        if ($directories === []) {
            return $this->resultBuilder->skipped('thumbnail_files', $this->context->dataPath(), '썸네일디렉토리를 열지못했습니다.');
        }

        $deletedPaths = [];
        foreach ($directories as $directory) {
            foreach ($this->context->globList($directory . '/thumb-*') as $path) {
                if (@unlink($path)) {
                    $deletedPaths[] = $path;
                }
            }
        }

        return $this->resultBuilder->completed('thumbnail_files', $this->context->dataPath(), $deletedPaths);
    }

    /**
     * @return array<string,mixed>
     */
    public function purgeMemberListFiles(): array
    {
        $directory = $this->context->dataPath() . '/member_list';
        if (!is_dir($directory) || !is_readable($directory)) {
            return $this->resultBuilder->skipped('member_list_files', $directory, '회원관리파일를 열지못했습니다.');
        }

        $deletedPaths = [];
        foreach ($this->context->globList($directory . '/*') as $path) {
            $basename = basename($path);
            if (is_file($path)) {
                if (strtolower((string)pathinfo($path, PATHINFO_EXTENSION)) === 'log') {
                    continue;
                }

                if (@unlink($path)) {
                    $deletedPaths[] = $path;
                }
                continue;
            }

            if (is_dir($path) && $basename !== 'log') {
                $this->context->deleteDirectoryTree($path);
                $deletedPaths[] = $path;
            }
        }

        return $this->resultBuilder->completed('member_list_files', $directory, $deletedPaths);
    }
}
