<?php

declare(strict_types=1);

namespace Api\Member\Service\Support;

use Api\Support\Exception\ApiException;
use Psr\Http\Message\UploadedFileInterface;

final class MemberImageProcessor
{
    public function validateUploadedFile(?UploadedFileInterface $uploadedFile, int $maxSize): UploadedFileInterface
    {
        if ($uploadedFile === null) {
            throw ApiException::badRequest('업로드 파일이 필요합니다.');
        }

        $error = $uploadedFile->getError();
        if ($error !== UPLOAD_ERR_OK) {
            throw ApiException::badRequest('파일 업로드 중 오류가 발생했습니다.');
        }

        $size = (int)($uploadedFile->getSize() ?? 0);
        if ($size <= 0) {
            throw ApiException::badRequest('빈 파일은 업로드할 수 없습니다.');
        }

        if ($maxSize > 0 && $size > $maxSize) {
            throw ApiException::badRequest('이미지 파일 용량이 제한을 초과했습니다.');
        }

        $source = trim((string)$uploadedFile->getClientFilename());
        if ($source === '' || preg_match('/\.(gif|jpe?g|png)$/i', $source) !== 1) {
            throw ApiException::badRequest('gif/jpg/png 이미지만 업로드할 수 있습니다.');
        }

        return $uploadedFile;
    }

    /**
     * @return array{0:int,1:int,2:int}
     */
    public function prepareImage(string $absolutePath, int $maxWidth, int $maxHeight): array
    {
        [$width, $height, $type] = $this->assertImage($absolutePath);

        if ($maxWidth > 0 && $maxHeight > 0 && ($width > $maxWidth || $height > $maxHeight)) {
            $resized = $this->resizeImage($absolutePath, $type, $maxWidth, $maxHeight);
            if (!$resized) {
                @unlink($absolutePath);
                throw ApiException::badRequest('이미지 가로/세로 크기가 제한을 초과합니다.');
            }

            [$width, $height, $type] = $this->assertImage($absolutePath);
            if ($width > $maxWidth || $height > $maxHeight) {
                @unlink($absolutePath);
                throw ApiException::badRequest('이미지 리사이즈 처리에 실패했습니다.');
            }
        }

        return [$width, $height, $type];
    }

    /**
     * @return array{0:int,1:int,2:int}
     */
    private function assertImage(string $absolutePath): array
    {
        $image = @getimagesize($absolutePath);
        if (!is_array($image)) {
            @unlink($absolutePath);
            throw ApiException::badRequest('유효한 이미지 파일이 아닙니다.');
        }

        $type = (int)$image[2];
        if (!in_array($type, [IMAGETYPE_GIF, IMAGETYPE_JPEG, IMAGETYPE_PNG], true)) {
            @unlink($absolutePath);
            throw ApiException::badRequest('gif/jpg/png 이미지만 허용됩니다.');
        }

        return [
            (int)$image[0],
            (int)$image[1],
            $type,
        ];
    }

    private function resizeImage(string $absolutePath, int $type, int $maxWidth, int $maxHeight): bool
    {
        if (!in_array($type, [IMAGETYPE_JPEG, IMAGETYPE_PNG], true)) {
            return false;
        }

        if (!function_exists('imagecreatetruecolor') || !function_exists('imagecopyresampled') || !function_exists('imagegif')) {
            return false;
        }

        $imageInfo = @getimagesize($absolutePath);
        if (!is_array($imageInfo)) {
            return false;
        }

        $sourceWidth = (int)$imageInfo[0];
        $sourceHeight = (int)$imageInfo[1];
        if ($sourceWidth <= 0 || $sourceHeight <= 0) {
            return false;
        }

        $ratio = min($maxWidth / $sourceWidth, $maxHeight / $sourceHeight);
        if ($ratio <= 0 || $ratio >= 1) {
            return true;
        }

        $targetWidth = max(1, (int)floor($sourceWidth * $ratio));
        $targetHeight = max(1, (int)floor($sourceHeight * $ratio));

        $sourceImage = null;
        if ($type === IMAGETYPE_JPEG && function_exists('imagecreatefromjpeg')) {
            $sourceImage = @imagecreatefromjpeg($absolutePath);
        } elseif ($type === IMAGETYPE_PNG && function_exists('imagecreatefrompng')) {
            $sourceImage = @imagecreatefrompng($absolutePath);
        }

        if ($sourceImage === false || $sourceImage === null) {
            return false;
        }

        $targetImage = @imagecreatetruecolor($targetWidth, $targetHeight);
        if ($targetImage === false) {
            return false;
        }

        $background = imagecolorallocate($targetImage, 255, 255, 255);
        if ($background === false) {
            $background = 0;
        }
        imagefilledrectangle($targetImage, 0, 0, $targetWidth, $targetHeight, $background);

        $copied = @imagecopyresampled(
            $targetImage,
            $sourceImage,
            0,
            0,
            0,
            0,
            $targetWidth,
            $targetHeight,
            $sourceWidth,
            $sourceHeight
        );

        if ($copied !== true) {
            return false;
        }

        return @imagegif($targetImage, $absolutePath);
    }
}
