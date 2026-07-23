<?php

/**
 * QaAttachmentStorage API module.
 *
 * @package  Gnuboard5\Api\v1\Qa\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Service;

use Api\Core\Config\EnvConfig;
use Api\Core\Config\EnvValueReader;
use Api\Support\Exception\ApiException;

final class QaAttachmentStorage
{
    public function generateStoredFileName(string $ip, string $sourceName): string
    {
        $chars = array_merge(range('0', '9'), range('a', 'z'), range('A', 'Z'));
        shuffle($chars);
        $shuffle = implode('', array_slice($chars, 0, 8));
        $safeIp = trim($ip);
        if ($safeIp === '') {
            $safeIp = EnvValueReader::string('UNKNOWN_IP_FALLBACK', 'unknown');
        }

        return md5(sha1($safeIp)) . '_' . $shuffle . '_' . $sourceName;
    }

    public function validateImageFileIfNeeded(string $sourceName, string $path): void
    {
        $extension = strtolower((string)pathinfo($sourceName, PATHINFO_EXTENSION));
        if ($extension === '') {
            return;
        }

        $imageExtensions = $this->tokenizeExtensions(EnvValueReader::string('UPLOAD_IMAGE_EXTENSIONS', 'jpg|jpeg|png|gif|webp|bmp'));
        $flashExtensions = $this->tokenizeExtensions(EnvValueReader::string('UPLOAD_FLASH_EXTENSIONS', 'swf'));
        if (!in_array($extension, $imageExtensions, true) && !in_array($extension, $flashExtensions, true)) {
            return;
        }

        $image = @getimagesize($path);
        if (!is_array($image) || $image[2] < 1 || $image[2] > 18) {
            @unlink($path);
            throw ApiException::badRequest('이미지/플래시 파일이 유효하지 않습니다.');
        }
    }

    public function qaStorageDir(): string
    {
        $path = rtrim($this->dataPath(), '/') . '/qa';
        $this->ensureDirectory($path);

        return $path;
    }

    public function applyFilePermission(string $path): void
    {
        @chmod($path, $this->envPermission('G5_FILE_PERMISSION', '0644'));
    }

    public function removeFileArtifacts(string $storedName): void
    {
        $storedName = basename(trim($storedName));
        if ($storedName === '') {
            return;
        }

        $baseDir = rtrim($this->dataPath(), '/') . '/qa';
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

    /**
     * @return array<int, string>
     */
    private function tokenizeExtensions(string $pattern): array
    {
        $splitted = preg_split('/[|,]/', $pattern);
        $parts = array_filter(array_map('trim', is_array($splitted) ? $splitted : []));

        $normalized = [];
        foreach ($parts as $part) {
            $normalized[] = strtolower($part);
        }

        return $normalized;
    }

    private function dataPath(): string
    {
        return EnvConfig::resolveDataPath();
    }

    private function ensureDirectory(string $path): void
    {
        if (!is_dir($path)) {
            $mode = $this->envPermission('G5_DIR_PERMISSION', '0755');
            if (!@mkdir($path, $mode, true) && !is_dir($path)) {
                throw ApiException::serverError('첨부 디렉토리 생성에 실패했습니다.');
            }
        }

        if (!is_writable($path)) {
            throw ApiException::serverError('첨부 디렉토리에 쓰기 권한이 없습니다.');
        }

        @chmod($path, $this->envPermission('G5_DIR_PERMISSION', '0755'));
    }

    private function envPermission(string $key, string $default): int
    {
        $raw = EnvValueReader::string($key, $default);
        if (preg_match('/^[0-7]{3,4}$/', $raw) !== 1) {
            $raw = $default;
        }

        return (int)octdec($raw);
    }
}
