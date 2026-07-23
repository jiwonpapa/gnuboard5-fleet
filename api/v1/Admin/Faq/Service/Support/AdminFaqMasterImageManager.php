<?php

declare(strict_types=1);

namespace Api\Admin\Faq\Service\Support;

use Api\Core\Config\EnvConfig;
use Api\Support\Exception\ApiException;
use Psr\Http\Message\UploadedFileInterface;
use Throwable;

final class AdminFaqMasterImageManager
{
    public function __construct(private readonly EnvConfig $envConfig)
    {
    }

    public function upload(int $masterId, ?UploadedFileInterface $uploadedFile, string $suffix): array
    {
        $validated = $this->validateUploadedFile($uploadedFile);
        $this->ensureFaqDirectory();

        $absolutePath = $this->imagePath($masterId, $suffix);
        try {
            $validated['uploadedFile']->moveTo($absolutePath);
        } catch (Throwable) {
            throw ApiException::serverError('FAQ 이미지 파일 이동에 실패했습니다.');
        }

        $metadata = $this->detectImageMetadata($absolutePath);
        @chmod($absolutePath, 0644);

        return $this->buildImageResponse($masterId, $suffix, true, $metadata);
    }

    public function delete(int $masterId, string $suffix): array
    {
        $deleted = $this->deleteArtifact($masterId, $suffix);

        return $this->buildImageResponse($masterId, $suffix, $deleted, null);
    }

    public function deleteArtifact(int $masterId, string $suffix): bool
    {
        $path = $this->imagePath($masterId, $suffix);
        if (!is_file($path)) {
            return false;
        }

        return @unlink($path);
    }

    /**
     * @return array<string,mixed>
     */
    public function describe(int $masterId, string $suffix): array
    {
        $path = $this->imagePath($masterId, $suffix);
        $metadata = $this->readImageMetadata($masterId, $suffix);

        return $this->buildImageResponse($masterId, $suffix, is_file($path), $metadata);
    }

    /**
     * @return array{uploadedFile:UploadedFileInterface,size:int}
     */
    private function validateUploadedFile(?UploadedFileInterface $uploadedFile): array
    {
        if ($uploadedFile === null) {
            throw ApiException::badRequest('업로드 파일이 필요합니다.');
        }

        if ($uploadedFile->getError() !== UPLOAD_ERR_OK) {
            throw ApiException::badRequest('파일 업로드 중 오류가 발생했습니다.');
        }

        $size = (int)($uploadedFile->getSize() ?? 0);
        if ($size <= 0) {
            throw ApiException::badRequest('빈 파일은 업로드할 수 없습니다.');
        }

        $source = trim((string)$uploadedFile->getClientFilename());
        if ($source === '' || preg_match('/\.(gif|jpe?g|png)$/i', $source) !== 1) {
            throw ApiException::badRequest('gif/jpg/png 이미지만 업로드할 수 있습니다.');
        }

        return [
            'uploadedFile' => $uploadedFile,
            'size' => $size,
        ];
    }

    /**
     * @return array{width:int,height:int,mime:string,size:int}
     */
    private function detectImageMetadata(string $absolutePath): array
    {
        $image = @getimagesize($absolutePath);
        if (!is_array($image)) {
            @unlink($absolutePath);
            throw ApiException::badRequest('유효한 이미지 파일이 아닙니다.');
        }

        $type = (int)$image[2];
        if (!in_array($type, [IMAGETYPE_GIF, IMAGETYPE_JPEG, IMAGETYPE_PNG], true)) {
            @unlink($absolutePath);
            throw ApiException::badRequest('gif/jpg/png 이미지만 업로드할 수 있습니다.');
        }

        return [
            'width' => (int)$image[0],
            'height' => (int)$image[1],
            'mime' => image_type_to_mime_type($type) ?: 'application/octet-stream',
            'size' => (int)filesize($absolutePath),
        ];
    }

    /**
     * @return array{width:int,height:int,mime:string,size:int}|null
     */
    private function readImageMetadata(int $masterId, string $suffix): ?array
    {
        $path = $this->imagePath($masterId, $suffix);
        if (!is_file($path)) {
            return null;
        }

        $image = @getimagesize($path);
        if (!is_array($image)) {
            return null;
        }

        return [
            'width' => (int)$image[0],
            'height' => (int)$image[1],
            'mime' => image_type_to_mime_type((int)$image[2]) ?: 'application/octet-stream',
            'size' => (int)filesize($path),
        ];
    }

    /**
     * @param array{width:int,height:int,mime:string,size:int}|null $metadata
     * @return array<string,mixed>
     */
    private function buildImageResponse(int $masterId, string $suffix, bool $exists, ?array $metadata): array
    {
        $relativePath = 'faq/' . $this->imageFilename($masterId, $suffix);

        return [
            'exists' => $exists,
            'relative_path' => $relativePath,
            'url' => '/data/' . $relativePath,
            'width' => $metadata['width'] ?? null,
            'height' => $metadata['height'] ?? null,
            'mime' => $metadata['mime'] ?? null,
            'size' => $metadata['size'] ?? null,
        ];
    }

    private function ensureFaqDirectory(): void
    {
        $directory = $this->faqDataDirectory();
        if (is_dir($directory)) {
            return;
        }

        if (@mkdir($directory, 0777, true) !== true && !is_dir($directory)) {
            throw ApiException::serverError('FAQ 이미지 디렉토리를 생성할 수 없습니다.');
        }
    }

    private function faqDataDirectory(): string
    {
        return rtrim($this->envConfig->dataPath, '/') . '/faq';
    }

    private function imagePath(int $masterId, string $suffix): string
    {
        return $this->faqDataDirectory() . '/' . $this->imageFilename($masterId, $suffix);
    }

    private function imageFilename(int $masterId, string $suffix): string
    {
        return $masterId . '_' . $suffix;
    }
}
