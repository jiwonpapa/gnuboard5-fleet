<?php

/**
 * QaAttachmentService API module.
 *
 * @package  Gnuboard5\Api\v1\Qa\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Service;

use Api\Qa\Service\Support\QaAttachmentFilenameSanitizer;
use Api\Qa\Service\Support\QaAttachmentUploadNormalizer;
use Api\Support\Exception\ApiException;
use Psr\Http\Message\UploadedFileInterface;
use Throwable;

final class QaAttachmentService
{
    private const MAX_UPLOAD_FILES = 2;
    private const UPLOAD_ERROR_MESSAGES = [
        UPLOAD_ERR_OK => '파일 업로드가 정상적으로 처리되지 않았습니다.',
        UPLOAD_ERR_INI_SIZE => '파일 용량이 서버 설정(upload_max_filesize)을 초과했습니다.',
        UPLOAD_ERR_FORM_SIZE => 'form에서 지정한 파일 용량 제한을 초과했습니다.',
        UPLOAD_ERR_PARTIAL => '파일이 일부만 업로드되었습니다.',
        UPLOAD_ERR_NO_FILE => '업로드 파일이 선택되지 않았습니다.',
        UPLOAD_ERR_NO_TMP_DIR => '임시 업로드 디렉토리를 사용할 수 없습니다.',
        UPLOAD_ERR_CANT_WRITE => '디스크에 파일 저장에 실패했습니다.',
        UPLOAD_ERR_EXTENSION => '업로드 확장 모듈이 파일 전송을 차단했습니다.',
    ];

    private ?QaAttachmentUploadNormalizer $resolvedUploadNormalizer = null;
    private ?QaAttachmentFilenameSanitizer $resolvedFilenameSanitizer = null;

    public function __construct(
        private readonly QaAttachmentStorage $storage,
        ?QaAttachmentUploadNormalizer $uploadNormalizer = null,
        ?QaAttachmentFilenameSanitizer $filenameSanitizer = null
    ) {
        $this->resolvedUploadNormalizer = $uploadNormalizer;
        $this->resolvedFilenameSanitizer = $filenameSanitizer;
    }

    /**
     * @return array<int, array{file: string, source: string}>
     */
    public function emptyAttachmentSlots(): array
    {
        return $this->uploadNormalizer()->emptyAttachmentSlots(self::MAX_UPLOAD_FILES);
    }

    /**
     * @param array<int|string, UploadedFileInterface> $uploadedFiles
     * @param array<int, array{file: string, source: string}> $current
     * @param array<int, bool> $deleteFlags
     * @return array<int, array{file: string, source: string}>
     */
    public function processAttachments(
        array $uploadedFiles,
        array $current,
        array $deleteFlags,
        int $uploadLimitSize,
        bool $isAdmin,
        string $ip
    ): array {
        $normalizedSlots = $this->uploadNormalizer()->normalizeUploadSlots($uploadedFiles, self::MAX_UPLOAD_FILES);
        $result = $current;
        $storageDir = $this->storage->qaStorageDir();

        for ($slot = 1; $slot <= self::MAX_UPLOAD_FILES; $slot++) {
            if (($deleteFlags[$slot] ?? false) === true) {
                $this->storage->removeFileArtifacts($result[$slot]['file']);
                $result[$slot] = ['file' => '', 'source' => ''];
            }

            $uploadedFile = $normalizedSlots[$slot] ?? null;
            if (!$uploadedFile instanceof UploadedFileInterface) {
                continue;
            }

            $errorCode = $uploadedFile->getError();
            if ($errorCode === UPLOAD_ERR_NO_FILE) {
                continue;
            }
            if ($errorCode !== UPLOAD_ERR_OK) {
                $message = self::UPLOAD_ERROR_MESSAGES[$errorCode] ?? '알 수 없는 파일 업로드 오류입니다.';
                throw ApiException::badRequest($message);
            }

            $size = (int)($uploadedFile->getSize() ?? 0);
            if ($size <= 0) {
                throw ApiException::badRequest('빈 파일은 업로드할 수 없습니다.');
            }
            if (!$isAdmin && $uploadLimitSize > 0 && $size > $uploadLimitSize) {
                throw ApiException::badRequest('첨부파일 용량이 제한을 초과했습니다.');
            }

            $sourceName = $this->filenameSanitizer()->sanitizeUploadedFilename((string)$uploadedFile->getClientFilename());
            if ($sourceName === '') {
                throw ApiException::badRequest('업로드 파일명이 유효하지 않습니다.');
            }

            $sourceName = $this->filenameSanitizer()->sanitizeExecutableExtensions($sourceName);
            $storedName = $this->storage->generateStoredFileName($ip, $sourceName);
            $destination = $storageDir . '/' . $storedName;

            try {
                $uploadedFile->moveTo($destination);
            } catch (Throwable) {
                throw ApiException::serverError('첨부파일 저장에 실패했습니다.');
            }

            if (!is_file($destination)) {
                throw ApiException::serverError('첨부파일 저장에 실패했습니다.');
            }

            $this->storage->validateImageFileIfNeeded($sourceName, $destination);
            $this->storage->applyFilePermission($destination);

            $previousStoredName = $result[$slot]['file'];
            if ($previousStoredName !== '' && $previousStoredName !== $storedName) {
                $this->storage->removeFileArtifacts($previousStoredName);
            }

            $result[$slot] = [
                'file' => $storedName,
                'source' => $sourceName,
            ];
        }

        return $result;
    }

    /**
     * @param array<int, mixed>|null $deletePayload
     * @return array<int, bool>
     */
    public function parseDeleteFlags(?array $deletePayload): array
    {
        return $this->uploadNormalizer()->parseDeleteFlags($deletePayload, self::MAX_UPLOAD_FILES);
    }

    private function uploadNormalizer(): QaAttachmentUploadNormalizer
    {
        if ($this->resolvedUploadNormalizer instanceof QaAttachmentUploadNormalizer) {
            return $this->resolvedUploadNormalizer;
        }

        $this->resolvedUploadNormalizer = new QaAttachmentUploadNormalizer();

        return $this->resolvedUploadNormalizer;
    }

    private function filenameSanitizer(): QaAttachmentFilenameSanitizer
    {
        if ($this->resolvedFilenameSanitizer instanceof QaAttachmentFilenameSanitizer) {
            return $this->resolvedFilenameSanitizer;
        }

        $this->resolvedFilenameSanitizer = new QaAttachmentFilenameSanitizer();

        return $this->resolvedFilenameSanitizer;
    }
}
