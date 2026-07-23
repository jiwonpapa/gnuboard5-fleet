<?php

/**
 * MemberImageManager API module.
 *
 * @package  Gnuboard5\Api\v1\Member\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Service;

use Api\Core\Config\EnvConfig;
use Api\Member\Service\Support\MemberImageProcessor;
use Api\Member\Service\Support\MemberImageStorage;
use Api\Support\Exception\ApiException;
use Psr\Http\Message\UploadedFileInterface;

final class MemberImageManager
{
    private EnvConfig $envConfig;
    private MemberImageStorage $storage;
    private MemberImageProcessor $processor;

    public function __construct(?EnvConfig $envConfig = null)
    {
        $this->envConfig = $envConfig ?? EnvConfig::fromEnv();
        $this->storage = new MemberImageStorage($this->envConfig);
        $this->processor = new MemberImageProcessor();
    }

    public function upload(
        string $memberId,
        ?UploadedFileInterface $uploadedFile,
        string $storage,
        int $maxSize,
        int $maxWidth,
        int $maxHeight
    ): array {
        $normalizedMemberId = $this->normalizeMemberId($memberId);
        $validated = $this->processor->validateUploadedFile($uploadedFile, $maxSize);
        $location = $this->storage->location($normalizedMemberId, $storage);

        $this->storage->storeUploadedFile($validated, $location['absolute_dir'], $location['absolute_path']);
        [$width, $height, $type] = $this->processor->prepareImage($location['absolute_path'], $maxWidth, $maxHeight);
        $fileSize = (int)filesize($location['absolute_path']);

        return [
            'mb_id' => $normalizedMemberId,
            'storage' => $storage,
            'relative_path' => $location['relative_path'],
            'url' => $location['url'],
            'size' => $fileSize,
            'width' => $width,
            'height' => $height,
            'mime' => image_type_to_mime_type($type) ?: 'application/octet-stream',
        ];
    }

    public function delete(string $memberId, string $storage): array
    {
        $normalizedMemberId = $this->normalizeMemberId($memberId);
        $location = $this->storage->location($normalizedMemberId, $storage);
        $deleted = $this->storage->deleteFile($location['absolute_path']);

        return [
            'mb_id' => $normalizedMemberId,
            'storage' => $storage,
            'relative_path' => $location['relative_path'],
            'url' => $location['url'],
            'deleted' => $deleted,
        ];
    }

    private function normalizeMemberId(string $memberId): string
    {
        $value = trim($memberId);
        if ($value === '' || preg_match('/^[a-zA-Z0-9_]{2,64}$/', $value) !== 1) {
            throw ApiException::badRequest('mb_id 형식이 올바르지 않습니다.');
        }

        return $value;
    }
}
