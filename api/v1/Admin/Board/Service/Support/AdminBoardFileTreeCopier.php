<?php

declare(strict_types=1);

namespace Api\Admin\Board\Service\Support;

use Api\Support\Exception\ApiException;
use FilesystemIterator;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;

final class AdminBoardFileTreeCopier
{
    public function __construct(private readonly ?string $dataPath = null)
    {
    }

    public function copy(string $sourceTable, string $targetTable, bool $copyPosts): void
    {
        $root = $this->fileRoot();
        if ($root === null) {
            return;
        }

        $source = $root . '/' . $sourceTable;
        $target = $root . '/' . $targetTable;
        if (file_exists($target)) {
            throw ApiException::conflict('복사 대상 게시판 파일 디렉터리가 이미 존재합니다.');
        }
        if (!@mkdir($target, $this->directoryPermission(), true) && !is_dir($target)) {
            throw ApiException::serverError('복사 대상 게시판 파일 디렉터리를 만들 수 없습니다.');
        }

        try {
            if ($copyPosts && is_dir($source)) {
                $this->copyDirectoryContents($source, $target);
            }
            $index = $target . '/index.php';
            if (!is_file($index) && file_put_contents($index, '') === false) {
                throw ApiException::serverError('게시판 파일 디렉터리 보호 파일을 만들 수 없습니다.');
            }
            @chmod($index, $this->filePermission());
        } catch (\Throwable $exception) {
            $this->removeDirectory($target);
            throw $exception;
        }
    }

    public function cleanup(string $targetTable): void
    {
        $root = $this->fileRoot();
        if ($root !== null) {
            $this->removeDirectory($root . '/' . $targetTable);
        }
    }

    private function copyDirectoryContents(string $source, string $target): void
    {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($source, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        /** @var SplFileInfo $entry */
        foreach ($iterator as $entry) {
            $relative = substr($entry->getPathname(), strlen($source) + 1);
            $destination = $target . '/' . $relative;
            if ($entry->isDir()) {
                if (!is_dir($destination) && !@mkdir($destination, $this->directoryPermission(), true)) {
                    throw ApiException::serverError('게시판 첨부파일 하위 디렉터리를 복사할 수 없습니다.');
                }
                continue;
            }
            if (!$entry->isFile() || !@copy($entry->getPathname(), $destination)) {
                throw ApiException::serverError('게시판 첨부파일을 복사할 수 없습니다.');
            }
            @chmod($destination, $this->filePermission());
        }
    }

    private function removeDirectory(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        /** @var SplFileInfo $entry */
        foreach ($iterator as $entry) {
            if ($entry->isDir()) {
                @rmdir($entry->getPathname());
            } else {
                @unlink($entry->getPathname());
            }
        }
        @rmdir($path);
    }

    private function fileRoot(): ?string
    {
        $dataPath = $this->dataPath;
        if ($dataPath === null && defined('G5_DATA_PATH')) {
            $constant = constant('G5_DATA_PATH');
            $dataPath = is_string($constant) ? $constant : null;
        }
        if (!is_string($dataPath) || trim($dataPath) === '') {
            return null;
        }

        return rtrim($dataPath, '/\\') . '/file';
    }

    private function directoryPermission(): int
    {
        $permission = defined('G5_DIR_PERMISSION') ? constant('G5_DIR_PERMISSION') : 0775;
        return is_int($permission) ? $permission : 0775;
    }

    private function filePermission(): int
    {
        $permission = defined('G5_FILE_PERMISSION') ? constant('G5_FILE_PERMISSION') : 0664;
        return is_int($permission) ? $permission : 0664;
    }
}
