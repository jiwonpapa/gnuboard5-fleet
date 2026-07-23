<?php

declare(strict_types=1);

namespace Api\File\Service;

use Api\Board\Service\BoardService;
use Api\Core\Config\EnvConfig;
use Api\File\Contracts\FileGateway;
use Api\Integration\Contracts\PostReadGateway;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\BoTable;

final class FileDeleteService
{
    use FileOperationSupport;

    public function __construct(
        private readonly FileGateway $fileGateway,
        private readonly BoardService $boardService,
        private readonly PostReadGateway $postGateway,
        private readonly EnvConfig $envConfig
    ) {
    }

    public function deleteFile(string $boTable, int $wrId, int $bfNo, array $member): void
    {
        $safeBoTable = BoTable::normalize($boTable);
        $wrIdSafe = $this->normalizePositiveWrId($wrId);
        $bfNoSafe = $this->normalizeNonNegativeInt($bfNo, 'bf_no');
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 사용자 정보가 없습니다.');
        }

        $board = $this->boardService->getBoardRow($safeBoTable);
        $this->boardService->assertGroupAccess($member, $board);
        $post = $this->postGateway->getPost($safeBoTable, $wrIdSafe);
        if ($post === null) {
            throw ApiException::notFound('원본 게시글을 찾을 수 없습니다.');
        }

        $adminRole = $this->boardService->resolveAdminRole($member, $board);
        if ($adminRole === null && $memberId !== trim((string)($post['mb_id'] ?? ''))) {
            throw ApiException::forbidden('작성자 본인 또는 관리자만 파일을 삭제할 수 있습니다.');
        }

        $file = $this->fileGateway->getFile($safeBoTable, $wrIdSafe, $bfNoSafe);
        if ($file === null || trim((string)($file['bf_file'] ?? '')) === '') {
            throw ApiException::notFound('파일을 찾을 수 없습니다.');
        }

        $affected = $this->fileGateway->deleteFileRecord($safeBoTable, $wrIdSafe, $bfNoSafe);
        if ($affected <= 0) {
            throw ApiException::notFound('파일을 찾을 수 없습니다.');
        }

        $this->fileGateway->updateWriteFileCount($safeBoTable, $wrIdSafe);
        $this->removeFileArtifacts($safeBoTable, (string)($file['bf_file'] ?? ''));
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
