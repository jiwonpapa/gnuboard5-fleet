<?php

declare(strict_types=1);

namespace Api\File\Service;

use Api\Support\Exception\ApiException;

trait FileMetadataSupport
{
    /**
     * @return array{width: int, height: int, type: int}
     */
    private function detectImageMetadata(string $source, string $filePath): array
    {
        $width = 0;
        $height = 0;
        $type = 0;
        $extension = strtolower((string)pathinfo($source, PATHINFO_EXTENSION));
        if ($extension === '') {
            return ['width' => 0, 'height' => 0, 'type' => 0];
        }

        $imageExtensions = $this->envConfig()->uploadImageExtensionList();
        $flashExtensions = $this->envConfig()->uploadFlashExtensionList();
        if (in_array($extension, $imageExtensions, true) || in_array($extension, $flashExtensions, true)) {
            $image = @getimagesize($filePath);
            if (!is_array($image)) {
                @unlink($filePath);
                throw ApiException::badRequest('이미지/플래시 파일이 유효하지 않습니다.');
            }
            if ($image[2] < 1 || $image[2] > 18) {
                @unlink($filePath);
                throw ApiException::badRequest('지원하지 않는 이미지 형식입니다.');
            }

            $width = (int)$image[0];
            $height = (int)$image[1];
            $type = (int)$image[2];
        }

        return ['width' => $width, 'height' => $height, 'type' => $type];
    }

    private function guessMimeType(string $filePath): string
    {
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($filePath);

        return is_string($mime) ? $mime : 'application/octet-stream';
    }
}
