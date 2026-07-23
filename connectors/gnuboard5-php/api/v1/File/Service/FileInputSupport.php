<?php

declare(strict_types=1);

namespace Api\File\Service;

use Api\Support\Exception\ApiException;
use Psr\Http\Message\UploadedFileInterface;

trait FileInputSupport
{
    private const MAX_UPLOAD_ERROR_MESSAGES = [
        UPLOAD_ERR_OK => '파일 업로드가 정상적으로 처리되지 않았습니다.',
        UPLOAD_ERR_INI_SIZE => '파일 용량이 서버 설정(upload_max_filesize)을 초과했습니다.',
        UPLOAD_ERR_FORM_SIZE => 'form에서 지정한 파일 용량 제한을 초과했습니다.',
        UPLOAD_ERR_PARTIAL => '파일이 일부만 업로드되었습니다.',
        UPLOAD_ERR_NO_FILE => '업로드 파일이 선택되지 않았습니다.',
        UPLOAD_ERR_NO_TMP_DIR => '임시 업로드 디렉토리를 사용할 수 없습니다.',
        UPLOAD_ERR_CANT_WRITE => '디스크에 파일 저장에 실패했습니다.',
        UPLOAD_ERR_EXTENSION => '업로드 확장 모듈이 파일 전송을 차단했습니다.',
    ];

    private function normalizeWrId(mixed $value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        $raw = is_string($value) ? trim($value) : (string)$value;
        if ($raw === '' || !preg_match('/^(0|[1-9][0-9]*)$/', $raw)) {
            throw ApiException::badRequest('wr_id는 0 이상의 정수여야 합니다.');
        }

        $wrId = (int)$raw;
        if ($wrId < 0) {
            throw ApiException::badRequest('wr_id는 0 이상의 정수여야 합니다.');
        }

        return $wrId;
    }

    private function normalizePositiveWrId(int $wrId): int
    {
        if ($wrId <= 0) {
            throw ApiException::badRequest('wr_id는 1 이상의 정수여야 합니다.');
        }

        return $wrId;
    }

    private function normalizeNonNegativeInt(int $value, string $field): int
    {
        if ($value < 0) {
            throw ApiException::badRequest($field . '는 0 이상의 정수여야 합니다.');
        }

        return $value;
    }

    /**
     * @return array{uploadedFile: UploadedFileInterface, size: int, source: string}
     */
    private function validateUploadedFile(?UploadedFileInterface $uploadedFile, int $uploadLimitSize): array
    {
        if ($uploadedFile === null) {
            throw ApiException::badRequest('file 필드가 필요합니다.');
        }

        $errorCode = $uploadedFile->getError();
        if ($errorCode !== UPLOAD_ERR_OK) {
            $message = self::MAX_UPLOAD_ERROR_MESSAGES[$errorCode] ?? '알 수 없는 파일 업로드 오류입니다.';
            throw ApiException::badRequest($message);
        }

        $size = (int)($uploadedFile->getSize() ?? 0);
        if ($size <= 0) {
            throw ApiException::badRequest('빈 파일은 업로드할 수 없습니다.');
        }

        $source = trim((string)$uploadedFile->getClientFilename());
        if ($source === '') {
            throw ApiException::badRequest('파일명이 유효하지 않습니다.');
        }

        $source = $this->fileGateway()->sanitizeUploadedFileName($source);
        if ($source === '') {
            throw ApiException::badRequest('업로드 파일명이 유효하지 않습니다.');
        }

        if ($uploadLimitSize > 0 && $size > $uploadLimitSize) {
            throw ApiException::badRequest('첨부파일 용량이 게시판 제한을 초과했습니다.');
        }

        return [
            'uploadedFile' => $uploadedFile,
            'size' => $size,
            'source' => $this->sanitizeExecutableExtensions($source),
        ];
    }

    private function sanitizeExecutableExtensions(string $filename): string
    {
        $sanitized = preg_replace('/\\.(php|pht|phtm|htm|cgi|pl|exe|jsp|asp|inc|phar)$/i', '$0-x', $filename);

        return is_string($sanitized) ? $sanitized : $filename;
    }
}
