<?php

declare(strict_types=1);

namespace Api\Post\Service\Support;

use Api\Board\Service\BoardService;
use Api\Integration\Contracts\BoardGateway;
use Api\Post\Contracts\PostGateway;
use Api\Post\Service\PostPermissionService;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\BoTable;

final class PostReadContextResolver
{
    public function __construct(
        private readonly PostGateway $postGateway,
        private readonly BoardService $boardService,
        private readonly BoardGateway $boardGateway,
        private readonly PostPermissionService $permissionService
    ) {
    }

    /**
     * @param array<string, mixed> $member
     * @return array{bo_table: string, board: array<string, mixed>}
     */
    public function resolveListContext(string $boTable, array $member): array
    {
        $safeBoTable = BoTable::normalize($boTable);
        if (!$this->boardGateway->exists($safeBoTable)) {
            throw ApiException::notFound('존재하지 않는 게시판입니다.');
        }

        $board = $this->boardService->getBoardRow($safeBoTable);
        $this->boardService->assertGroupAccess($member, $board);

        $memberLevel = (int)($member['mb_level'] ?? 255);
        $listLevel = (int)($board['bo_list_level'] ?? 0);
        if ($memberLevel > 0 && $memberLevel < $listLevel) {
            throw ApiException::forbidden('해당 게시판 목록 조회 권한이 없습니다.');
        }

        return [
            'bo_table' => $safeBoTable,
            'board' => $board,
        ];
    }

    /**
     * @param array<string, mixed> $member
     * @return array{bo_table: string, wr_id: int, board: array<string, mixed>, post: array<string, mixed>}
     */
    public function resolveReadablePost(string $boTable, int $wrId, array $member): array
    {
        $safeBoTable = BoTable::normalize($boTable);
        $wrIdSafe = $this->permissionService->normalizeWrId($wrId);

        $board = $this->boardService->getBoardRow($safeBoTable);
        $this->boardService->assertGroupAccess($member, $board);

        $post = $this->postGateway->getPost($safeBoTable, $wrIdSafe);
        if ($post === null) {
            throw ApiException::notFound('게시글을 찾을 수 없습니다.');
        }

        $isPublic = ((int)($board['bo_read_level'] ?? 0)) === 0;
        if (!$isPublic && !$this->boardService->isMemberAllowedForRead($member, $safeBoTable)) {
            throw ApiException::forbidden('해당 게시판 조회 권한이 없습니다.');
        }

        $this->permissionService->assertSecretReadable($post, $member, $board);

        return [
            'bo_table' => $safeBoTable,
            'wr_id' => $wrIdSafe,
            'board' => $board,
            'post' => $post,
        ];
    }
}
