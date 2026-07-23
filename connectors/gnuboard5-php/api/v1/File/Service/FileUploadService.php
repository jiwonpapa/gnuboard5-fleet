<?php

declare(strict_types=1);

namespace Api\File\Service;

use Api\Board\Service\BoardService;
use Api\Core\Config\EnvConfig;
use Api\Core\Util\G5DateTime;
use Api\File\Contracts\FileGateway;
use Api\Integration\Contracts\PostReadGateway;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\BoTable;
use Psr\Http\Message\UploadedFileInterface;
use Throwable;

final class FileUploadService
{
    use FileOperationSupport;

    public function __construct(
        private readonly FileGateway $fileGateway,
        private readonly BoardService $boardService,
        private readonly PostReadGateway $postGateway,
        private readonly EnvConfig $envConfig
    ) {
    }

    public function uploadFile(string $boTable, array $member, array $payload, ?UploadedFileInterface $uploadedFile): array
    {
        $safeBoTable = BoTable::normalize($boTable);
        if (trim((string)($member['mb_id'] ?? '')) === '') {
            throw ApiException::unauthorized('인증 사용자 정보가 없습니다.');
        }

        $board = $this->boardService->getBoardRow($safeBoTable);
        $this->boardService->assertGroupAccess($member, $board);

        if (!$this->boardService->isMemberAllowedForWrite($member, $safeBoTable)) {
            throw ApiException::forbidden('해당 게시판 글쓰기 권한이 없습니다.');
        }

        $uploadLimitSize = (int)($board['bo_upload_size'] ?? 0);
        $uploadLimitCount = (int)($board['bo_upload_count'] ?? 0);

        $wrId = $this->normalizeWrId($payload['wr_id'] ?? null);
        if ($wrId > 0 && $this->postGateway->getPost($safeBoTable, $wrId) === null) {
            throw ApiException::notFound('원본 게시글을 찾을 수 없습니다.');
        }

        if ($wrId > 0 && $uploadLimitCount > 0 && $this->fileGateway->countFiles($safeBoTable, $wrId) >= $uploadLimitCount) {
            throw ApiException::forbidden('첨부파일 개수를 초과했습니다.');
        }

        $validated = $this->validateUploadedFile($uploadedFile, $uploadLimitSize);
        $storedName = $this->fileGateway->generateStoredFileName($validated['source']);

        $storageDir = $this->dataPath() . '/file/' . $safeBoTable;
        $this->ensureDirectory($storageDir);
        $destPath = $storageDir . '/' . $storedName;

        try {
            $validated['uploadedFile']->moveTo($destPath);
        } catch (Throwable) {
            throw ApiException::serverError('파일 이동에 실패했습니다.');
        }

        if (!is_file($destPath)) {
            throw ApiException::serverError('업로드된 파일을 찾을 수 없습니다.');
        }

        $this->applyFilePermission($destPath);

        $image = $this->detectImageMetadata($validated['source'], $destPath);
        $bfNo = $this->fileGateway->getNextBfNo($safeBoTable, $wrId);
        $mimeType = $this->guessMimeType($destPath);

        $record = $this->fileGateway->createFileRecord(
            $safeBoTable,
            $wrId,
            $bfNo,
            $validated['source'],
            $storedName,
            $validated['size'],
            $image['width'],
            $image['height'],
            $image['type'],
            $mimeType,
            G5DateTime::now()
        );

        $this->fileGateway->updateWriteFileCount($safeBoTable, $wrId);
        $record['bf_file_mime'] = $mimeType;
        $record['path'] = $destPath;

        return $record;
    }

    protected function fileGateway(): FileGateway
    {
        return $this->fileGateway;
    }

    protected function envConfig(): EnvConfig
    {
        return $this->envConfig;
    }
}
