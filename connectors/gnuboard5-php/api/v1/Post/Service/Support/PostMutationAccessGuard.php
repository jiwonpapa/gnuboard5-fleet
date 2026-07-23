<?php

declare(strict_types=1);

namespace Api\Post\Service\Support;

use Api\Board\Service\BoardService;
use Api\Post\Contracts\PostGateway;
use Api\Post\Service\PostPermissionService;
use Api\Support\Exception\ApiException;

final readonly class PostMutationAccessGuard
{
    public function __construct(
        private BoardService $boardService,
        private PostPermissionService $permissionService,
        private PostGateway $postGateway
    ) {
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $board
     */
    public function assertCreateAllowed(array $member, array $board, string $safeBoTable): ?string
    {
        $this->boardService->assertGroupAccess($member, $board);
        if (!$this->boardService->isMemberAllowedForWrite($member, $safeBoTable)) {
            throw ApiException::forbidden('해당 게시판 글쓰기 권한이 없습니다.');
        }

        $adminRole = $this->boardService->resolveAdminRole($member, $board);
        if ($adminRole === null) {
            $this->permissionService->assertWriteDelay(
                $this->postGateway->getLastWriteTime($safeBoTable, (string)($member['mb_id'] ?? '')),
                $this->boardService->getDelaySeconds()
            );
        }

        return $adminRole;
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $board
     * @param array<string, mixed>|null $post
     * @return array{post:array<string, mixed>, admin_role:?string}
     */
    public function assertUpdateAllowed(array $member, array $board, ?array $post): array
    {
        $this->boardService->assertGroupAccess($member, $board);

        if ($post === null) {
            throw ApiException::notFound('게시글을 찾을 수 없습니다.');
        }

        $adminRole = $this->boardService->resolveAdminRole($member, $board);
        $memberId = (string)($member['mb_id'] ?? '');
        if ($adminRole === null && $memberId !== (string)($post['mb_id'] ?? '')) {
            throw ApiException::forbidden('작성자 본인 또는 관리자만 수정할 수 있습니다.');
        }

        return [
            'post' => $post,
            'admin_role' => $adminRole,
        ];
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $board
     * @param array<string, mixed>|null $parent
     * @return array{parent:array<string, mixed>, admin_role:?string}
     */
    public function assertReplyAllowed(array $member, array $board, ?array $parent, string $safeBoTable): array
    {
        $this->boardService->assertGroupAccess($member, $board);

        $memberLevel = (int)($member['mb_level'] ?? 0);
        $adminRole = $this->boardService->resolveAdminRole($member, $board);
        if ($adminRole === null && $memberLevel < (int)($board['bo_reply_level'] ?? 0)) {
            throw ApiException::forbidden('답변 작성 권한이 없습니다.');
        }

        if ($parent === null) {
            throw ApiException::notFound('원글을 찾을 수 없습니다.');
        }
        if ((bool)($parent['is_notice'] ?? false)) {
            throw ApiException::forbidden('공지글에는 답변할 수 없습니다.');
        }

        if ($adminRole === null) {
            $this->permissionService->assertWriteDelay(
                $this->postGateway->getLastWriteTime($safeBoTable, (string)($member['mb_id'] ?? '')),
                $this->boardService->getDelaySeconds()
            );
        }

        return [
            'parent' => $parent,
            'admin_role' => $adminRole,
        ];
    }
}
