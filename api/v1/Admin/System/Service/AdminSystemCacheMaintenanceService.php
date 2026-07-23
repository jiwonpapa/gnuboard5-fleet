<?php

declare(strict_types=1);

namespace Api\Admin\System\Service;

use Api\Admin\System\Service\Support\AdminSystemMaintenanceContext;
use Api\Admin\System\Service\Support\AdminSystemMaintenanceResultBuilder;

final class AdminSystemCacheMaintenanceService
{
    public function __construct(
        private readonly AdminSystemMaintenanceContext $context,
        private readonly AdminSystemMaintenanceResultBuilder $resultBuilder
    ) {
    }

    /**
     * @return array<string,mixed>
     */
    public function purgeSessionFiles(): array
    {
        $directory = $this->context->dataPath() . '/session';
        if (!is_dir($directory) || !is_readable($directory)) {
            return $this->resultBuilder->skipped('session_files', $directory, '세션 디렉토리를 열지못했습니다.');
        }

        $deletedPaths = [];
        $entries = scandir($directory);
        if (is_array($entries)) {
            foreach ($entries as $entry) {
                if (!str_starts_with($entry, 'sess_')) {
                    continue;
                }

                $path = $directory . '/' . $entry;
                $atime = @fileatime($path);
                if ($atime === false || time() <= $atime + (3600 * 6)) {
                    continue;
                }

                if (@unlink($path)) {
                    $deletedPaths[] = $path;
                }
            }
        }

        return $this->resultBuilder->completed('session_files', $directory, $deletedPaths);
    }

    /**
     * @return array<string,mixed>
     */
    public function purgeCacheFiles(): array
    {
        $directory = $this->context->dataPath() . '/cache';
        $socialLogDeletedCount = $this->deleteSocialLogFiles();
        if (!is_dir($directory) || !is_readable($directory)) {
            $result = $this->resultBuilder->skipped('cache_files', $directory, '캐시디렉토리를 열지못했습니다.');
            $result['social_log_deleted_count'] = $socialLogDeletedCount;

            return $result;
        }

        $deletedPaths = [];
        foreach ($this->context->globList($directory . '/latest-*') as $path) {
            if (@unlink($path)) {
                $deletedPaths[] = $path;
            }
        }
        foreach ($this->context->globList($directory . '/content-*') as $path) {
            if (@unlink($path)) {
                $deletedPaths[] = $path;
            }
        }

        $result = $this->resultBuilder->completed('cache_files', $directory, $deletedPaths);
        $result['social_log_deleted_count'] = $socialLogDeletedCount;

        return $result;
    }

    /**
     * @return array<string,mixed>
     */
    public function purgeCaptchaFiles(): array
    {
        $directory = $this->context->dataPath() . '/cache';
        if (!is_dir($directory) || !is_readable($directory)) {
            return $this->resultBuilder->skipped('captcha_files', $directory, '캐시디렉토리를 열지못했습니다.');
        }

        $deletedPaths = [];
        $beforeTime = time() - 3600;
        foreach ($this->context->globList($directory . '/?captcha-*') as $path) {
            $mtime = @filemtime($path);
            if ($mtime === false || $mtime > $beforeTime) {
                continue;
            }

            if (@unlink($path)) {
                $deletedPaths[] = $path;
            }
        }

        return $this->resultBuilder->completed('captcha_files', $directory, $deletedPaths);
    }

    private function deleteSocialLogFiles(): int
    {
        $deletedCount = 0;
        foreach ($this->context->globList($this->context->dataPath() . '/tmp/social_*') as $path) {
            if (@unlink($path)) {
                $deletedCount++;
            }
        }

        return $deletedCount;
    }
}
