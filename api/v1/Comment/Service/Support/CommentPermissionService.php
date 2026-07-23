<?php

declare(strict_types=1);

namespace Api\Comment\Service\Support;

use Api\Board\Service\BoardService;
use Api\Support\Exception\ApiException;

final readonly class CommentPermissionService
{
    public function __construct(private BoardService $boardService)
    {
    }

    /**
     * @param array<string,mixed> $member
     */
    public function assertCanCreate(array $member, string $boTable): void
    {
        if ($this->boardService->isMemberAllowedForComment($member, $boTable)) {
            return;
        }

        throw ApiException::forbidden('해당 게시판 댓글 작성 권한이 없습니다.');
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $comment
     * @param array<string,mixed> $board
     */
    public function assertCanMutate(array $member, array $comment, array $board): void
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 사용자 정보가 없습니다.');
        }

        $adminRole = $this->boardService->resolveAdminRole($member, $board);
        if ($adminRole === null && $memberId !== (string)($comment['mb_id'] ?? '')) {
            throw ApiException::forbidden('작성자 본인 또는 관리자만 수정/삭제할 수 있습니다.');
        }
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $board
     */
    public function shouldEnforceWriteDelay(array $member, array $board): bool
    {
        return $this->boardService->resolveAdminRole($member, $board) === null;
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $comment
     * @param array<string,mixed> $board
     */
    public function assertCanDelete(array $member, array $comment, array $board, int $childCount): void
    {
        $adminRole = $this->boardService->resolveAdminRole($member, $board);
        if ($adminRole === null && $childCount > 0) {
            throw ApiException::forbidden('답변댓글이 존재하므로 삭제할 수 없습니다.');
        }

        $this->assertCanMutate($member, $comment, $board);
    }
}
