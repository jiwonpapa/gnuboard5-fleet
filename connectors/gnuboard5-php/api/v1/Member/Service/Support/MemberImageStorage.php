<?php

declare(strict_types=1);

namespace Api\Member\Service\Support;

use Api\Core\Config\EnvConfig;
use Api\Support\Exception\ApiException;
use Psr\Http\Message\UploadedFileInterface;
use Throwable;

final class MemberImageStorage
{
    public function __construct(private readonly EnvConfig $envConfig)
    {
    }

    /**
     * @return array{relative_path:string, absolute_dir:string, absolute_path:string, url:string}
     */
    public function location(string $memberId, string $storage): array
    {
        $subDir = substr($memberId, 0, 2);
        $filename = $this->iconName($memberId) . '.gif';
        $relativePath = $storage . '/' . $subDir . '/' . $filename;

        return [
            'relative_path' => $relativePath,
            'absolute_dir' => $this->dataPath() . '/' . $storage . '/' . $subDir,
            'absolute_path' => $this->dataPath() . '/' . $relativePath,
            'url' => '/data/' . $relativePath,
        ];
    }

    public function storeUploadedFile(UploadedFileInterface $uploadedFile, string $absoluteDir, string $absolutePath): void
    {
        $this->ensureDirectory($absoluteDir);

        try {
            $uploadedFile->moveTo($absolutePath);
        } catch (Throwable $exception) {
            throw ApiException::serverError('이미지 파일 이동에 실패했습니다.');
        }

        if (!is_file($absolutePath)) {
            throw ApiException::serverError('업로드된 이미지 파일을 찾을 수 없습니다.');
        }

        $this->applyFilePermission($absolutePath);
    }

    public function deleteFile(string $absolutePath): bool
    {
        if (!is_file($absolutePath)) {
            return false;
        }

        return @unlink($absolutePath);
    }

    private function dataPath(): string
    {
        return $this->envConfig->dataPath;
    }

    private function ensureDirectory(string $path): void
    {
        if (!is_dir($path)) {
            if (!@mkdir($path, $this->envConfig->dirPermission, true) && !is_dir($path)) {
                throw ApiException::serverError('이미지 디렉토리 생성에 실패했습니다.');
            }
        }

        if (!is_writable($path)) {
            throw ApiException::serverError('이미지 디렉토리에 쓰기 권한이 없습니다.');
        }

        @chmod($path, $this->envConfig->dirPermission);
    }

    private function applyFilePermission(string $path): void
    {
        @chmod($path, $this->envConfig->filePermission);
    }

    private function iconName(string $memberId): string
    {
        return $memberId;
    }
}
