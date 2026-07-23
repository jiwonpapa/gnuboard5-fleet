<?php

declare(strict_types=1);

namespace Api\File\Service;

use Api\Board\Service\BoardService;
use Api\Core\Config\EnvConfig;
use Api\File\Contracts\FileGateway;
use Api\Integration\Contracts\PostReadGateway;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\BoTable;

final class FileReadService
{
    use FileOperationSupport;

    public function __construct(
        private readonly FileGateway $fileGateway,
        private readonly BoardService $boardService,
        private readonly PostReadGateway $postGateway,
        private readonly EnvConfig $envConfig
    ) {
    }

    public function getDownloadPayload(string $boTable, int $wrId, int $bfNo, array $member): array
    {
        $safeBoTable = BoTable::normalize($boTable);
        $board = $this->boardService->getBoardRow($safeBoTable);
        $this->boardService->assertGroupAccess($member, $board);
        if (!$this->boardService->isMemberAllowedForRead($member, $safeBoTable)) {
            throw ApiException::forbidden('해당 게시판 조회 권한이 없습니다.');
        }

        $downloadLevel = (int)($board['bo_download_level'] ?? 0);
        $downloadPoint = (int)($board['bo_download_point'] ?? 0);
        $memberId = trim((string)($member['mb_id'] ?? ''));
        $post = $this->postGateway->getPost($safeBoTable, $wrId);
        if ($post === null) {
            throw ApiException::notFound('원본 게시글을 찾을 수 없습니다.');
        }

        if ($downloadLevel > 0) {
            if ($memberId === '') {
                throw ApiException::unauthorized('인증 토큰이 필요합니다.');
            }
            if (!$this->boardService->isMemberAllowedForDownload($member, $safeBoTable)) {
                throw ApiException::forbidden('해당 게시판 다운로드 권한이 없습니다.');
            }
        }

        $file = $this->fileGateway->getFile($safeBoTable, $wrId, $bfNo);
        if ($file === null || trim((string)($file['bf_file'] ?? '')) === '') {
            throw ApiException::notFound('파일을 찾을 수 없습니다.');
        }

        $path = $this->dataPath() . '/file/' . $safeBoTable . '/' . $file['bf_file'];
        if (!is_file($path) || !is_readable($path)) {
            throw ApiException::notFound('파일이 존재하지 않습니다.');
        }

        $isOwner = $memberId !== '' && $memberId === trim((string)($post['mb_id'] ?? ''));
        if ($downloadPoint !== 0 && !$isOwner) {
            if ($memberId === '') {
                throw ApiException::unauthorized('다운로드 포인트 정책으로 인해 로그인이 필요합니다.');
            }

            $this->fileGateway->applyDownloadPoint(
                $memberId,
                $safeBoTable,
                $wrId,
                $bfNo,
                $downloadPoint,
                trim((string)($board['bo_subject'] ?? '게시판')) . " {$wrId} 파일 다운로드"
            );
        }

        $this->fileGateway->incrementDownloadCount($safeBoTable, $wrId, $bfNo);
        $file['path'] = $path;
        $file['bf_file_mime'] = $this->guessMimeType($path);

        return $file;
    }

    public function listFiles(string $boTable, int $wrId, array $member = []): array
    {
        $safeBoTable = BoTable::normalize($boTable);
        $wrIdSafe = $this->normalizePositiveWrId($wrId);
        $board = $this->boardService->getBoardRow($safeBoTable);
        $this->boardService->assertGroupAccess($member, $board);

        if (!$this->boardService->isMemberAllowedForRead($member, $safeBoTable)) {
            throw ApiException::forbidden('해당 게시판 조회 권한이 없습니다.');
        }

        if ($this->postGateway->getPost($safeBoTable, $wrIdSafe) === null) {
            throw ApiException::notFound('원본 게시글을 찾을 수 없습니다.');
        }

        $files = $this->fileGateway->listFiles($safeBoTable, $wrIdSafe);

        return [
            'items' => $files,
            'total' => count($files),
        ];
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
