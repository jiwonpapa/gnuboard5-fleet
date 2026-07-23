<?php

declare(strict_types=1);

namespace Api\File\Service;

use Api\Support\Exception\ApiException;

trait FileStorageSupport
{
    private function applyFilePermission(string $path): void
    {
        @chmod($path, $this->envConfig()->filePermission);
    }

    private function ensureDirectory(string $path): void
    {
        if (!is_dir($path)) {
            if (!@mkdir($path, $this->envConfig()->dirPermission, true) && !is_dir($path)) {
                throw ApiException::serverError('첨부 디렉토리 생성에 실패했습니다.');
            }
        }

        if (!is_writable($path)) {
            throw ApiException::serverError('첨부 디렉토리에 쓰기 권한이 없습니다.');
        }

        @chmod($path, $this->envConfig()->dirPermission);
    }

    private function dataPath(): string
    {
        return $this->envConfig()->dataPath;
    }

    private function removeFileArtifacts(string $boTable, string $storedName): void
    {
        $storedName = basename(trim($storedName));
        if ($storedName === '') {
            return;
        }

        $baseDir = rtrim($this->dataPath(), '/') . '/file/' . $boTable;
        $filePath = $baseDir . '/' . $storedName;
        if (is_file($filePath)) {
            @unlink($filePath);
        }

        $thumbCandidates = [
            $baseDir . '/thumb/' . $storedName,
            $baseDir . '/thumb-' . $storedName,
        ];
        $thumbCandidates = array_merge($thumbCandidates, glob($baseDir . '/thumb-*' . $storedName) ?: []);
        foreach (array_unique($thumbCandidates) as $thumbPath) {
            if (is_string($thumbPath) && is_file($thumbPath)) {
                @unlink($thumbPath);
            }
        }
    }
}
