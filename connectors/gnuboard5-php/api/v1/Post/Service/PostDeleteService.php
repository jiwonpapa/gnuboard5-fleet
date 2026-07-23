<?php

declare(strict_types=1);

namespace Api\Post\Service;

use Api\Board\Service\BoardService;
use Api\Comment\Service\CommentService;
use Api\Core\Enum\MemberLevel;
use Api\Core\Plugin\EventDispatcher;
use Api\Post\Contracts\PostGateway;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\BoTable;

final class PostDeleteService
{
    public function __construct(
        private readonly PostGateway $postGateway,
        private readonly BoardService $boardService,
        private readonly PostPermissionService $permissionService,
        private readonly PostPointService $pointService,
        private readonly CommentService $commentService,
        private readonly EventDispatcher $events
    ) {
    }

    public function deletePost(string $boTable, int $wrId, array $member): void
    {
        $safeBoTable = BoTable::normalize($boTable);
        $board = $this->boardService->getBoardRow($safeBoTable);
        $this->boardService->assertGroupAccess($member, $board);

        $post = $this->postGateway->getPost($safeBoTable, $this->permissionService->normalizeWrId($wrId));
        if ($post === null) {
            throw ApiException::notFound('게시글을 찾을 수 없습니다.');
        }

        $memberId = (string)($member['mb_id'] ?? '');
        $adminRole = $this->boardService->resolveAdminRole($member, $board);
        if ($adminRole === null && $memberId !== (string)($post['mb_id'] ?? '')) {
            throw ApiException::forbidden('작성자 본인 또는 관리자만 삭제할 수 있습니다.');
        }

        if ($adminRole === null) {
            if ($this->postGateway->countReplies($safeBoTable, (int)($post['wr_id'] ?? 0)) > 0) {
                throw ApiException::forbidden('답변글이 존재하므로 삭제할 수 없습니다.');
            }

            $deleteLimit = max(0, (int)($board['bo_count_delete'] ?? 0));
            if ($deleteLimit > 0) {
                $otherCommentCount = $this->postGateway->countOtherMemberComments(
                    $safeBoTable,
                    (int)($post['wr_id'] ?? 0),
                    $memberId
                );
                if ($otherCommentCount >= $deleteLimit) {
                    throw ApiException::forbidden('댓글이 ' . $deleteLimit . '건 이상 달린 글은 삭제할 수 없습니다.');
                }
            }
        }

        $comments = $this->postGateway->listCommentsForPost($safeBoTable, (int)($post['wr_id'] ?? 0));
        $this->pointService->revokeCommentPointsForPost($board, $safeBoTable, $comments);
        $this->pointService->revokeWritePoint($post, $board, $safeBoTable);
        $this->postGateway->deletePost($safeBoTable, (int)($post['wr_id'] ?? 0));
        $this->events->dispatch('post.deleted', [
            'post_id' => (int)($post['wr_id'] ?? 0),
            'board_id' => $safeBoTable,
            'member_id' => $memberId,
        ]);
    }

    public function deleteNewPosts(array $member, array $bnIds): array
    {
        if (!MemberLevel::fromNumeric((int)($member['mb_level'] ?? 0))->isAdmin()) {
            throw ApiException::forbidden('최고관리자 권한이 필요합니다.');
        }

        $safeIds = $this->permissionService->sanitizeBnIds($bnIds);
        if ($safeIds === []) {
            throw ApiException::badRequest('bn_ids는 1개 이상의 정수 배열이어야 합니다.');
        }

        $targets = $this->postGateway->findNewPostTargets($safeIds);
        $superMember = ['mb_id' => trim((string)($member['mb_id'] ?? 'admin')), 'mb_level' => 10];
        $deletedPosts = 0;
        $deletedComments = 0;
        $skipped = 0;

        foreach ($targets as $target) {
            $boTableRaw = trim((string)($target['bo_table'] ?? ''));
            $wrId = (int)($target['wr_id'] ?? 0);
            $wrParent = (int)($target['wr_parent'] ?? 0);
            if ($boTableRaw === '' || $wrId <= 0 || $wrParent <= 0) {
                $skipped++;
                continue;
            }

            try {
                $boTable = BoTable::normalize($boTableRaw);
            } catch (ApiException) {
                $skipped++;
                continue;
            }

            if ($wrId === $wrParent) {
                try {
                    $this->deletePost($boTable, $wrId, $superMember);
                    $deletedPosts++;
                } catch (ApiException $exception) {
                    if ($exception->statusCode === 404) {
                        $skipped++;
                        continue;
                    }
                    throw $exception;
                }
                continue;
            }

            try {
                $this->commentService->deleteComment($boTable, $wrParent, $wrId, $superMember);
                $deletedComments++;
            } catch (ApiException $exception) {
                if ($exception->statusCode === 404) {
                    $skipped++;
                    continue;
                }
                throw $exception;
            }
        }

        $this->postGateway->deleteNewPosts($safeIds);

        return [
            'deleted' => true,
            'deleted_count' => $deletedPosts + $deletedComments,
            'deleted_posts' => $deletedPosts,
            'deleted_comments' => $deletedComments,
            'skipped' => $skipped,
            'bn_ids' => $safeIds,
        ];
    }
}
