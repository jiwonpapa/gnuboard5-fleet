<?php

/**
 * CommentService API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Comment\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Comment\Service;

use Api\Board\Service\BoardService;
use Api\Comment\Contracts\CommentGateway;
use Api\Comment\Service\Support\CommentContextService;
use Api\Comment\Service\Support\CommentInputNormalizer;
use Api\Comment\Service\Support\CommentMutationLifecycle;
use Api\Comment\Service\Support\CommentPermissionService;
use Api\Core\Plugin\EventDispatcher;
use Api\Integration\Contracts\PostReadGateway;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\BoTable;

final class CommentService
{
    private ?CommentContextService $resolvedContextService = null;
    private ?CommentInputNormalizer $resolvedInputNormalizer = null;
    private ?CommentMutationLifecycle $resolvedMutationLifecycle = null;
    private ?CommentPermissionService $resolvedPermissionService = null;

    public function __construct(
        private readonly CommentGateway $commentGateway,
        private readonly PostReadGateway $postGateway,
        private readonly BoardService $boardService,
        private readonly EventDispatcher $events
    ) {
    }

    public function listComments(string $boTable, int $postId): array
    {
        $safeBoTable = BoTable::normalize($boTable);
        $this->boardService->getBoardRow($safeBoTable);
        $post = $this->contextService()->loadPostOrFail($safeBoTable, $this->inputNormalizer()->wrId($postId));

        $comments = $this->commentGateway->listComments($safeBoTable, (int)($post['wr_id'] ?? 0));

        return [
            'items' => $comments,
        ];
    }

    public function createComment(string $boTable, int $postId, array $member, array $payload, string $ip): array
    {
        $this->inputNormalizer()->assertCreatePayload($payload);
        $safeBoTable = BoTable::normalize($boTable);
        $board = $this->boardService->getBoardRow($safeBoTable);
        $this->boardService->assertGroupAccess($member, $board);
        $postIdSafe = $this->inputNormalizer()->wrId($postId);

        $this->permissionService()->assertCanCreate($member, $safeBoTable);
        $this->contextService()->loadPostOrFail($safeBoTable, $postIdSafe);

        $content = $this->inputNormalizer()->content($payload);

        $parentCommentId = isset($payload['parent_comment_id'])
            ? $this->inputNormalizer()->optionalInt($payload['parent_comment_id'], 'parent_comment_id')
            : null;
        $this->contextService()->assertParentCommentForPost($safeBoTable, $postIdSafe, $parentCommentId);

        if ($this->permissionService()->shouldEnforceWriteDelay($member, $board)) {
            $this->inputNormalizer()->assertWriteDelay(
                $this->commentGateway->getLastCommentWriteTime($safeBoTable, (string)($member['mb_id'] ?? '')),
                $this->boardService->getDelaySeconds()
            );
        }

        $commentId = $this->commentGateway->createComment(
            $safeBoTable,
            $postIdSafe,
            $member,
            $content,
            $parentCommentId,
            $ip
        );

        $memberId = $this->inputNormalizer()->memberId($member);
        return $this->mutationLifecycle()->handleCreated(
            $safeBoTable,
            $postIdSafe,
            $commentId,
            $memberId,
            (int)($board['bo_comment_point'] ?? 0),
            (string)($board['bo_subject'] ?? '')
        );
    }

    public function updateComment(string $boTable, int $postId, int $commentId, array $member, array $payload): array
    {
        $this->inputNormalizer()->assertUpdatePayload($payload);
        $safeBoTable = BoTable::normalize($boTable);
        $board = $this->boardService->getBoardRow($safeBoTable);
        $this->boardService->assertGroupAccess($member, $board);
        $postIdSafe = $this->inputNormalizer()->wrId($postId);
        $commentIdSafe = $this->inputNormalizer()->wrId($commentId);

        $comment = $this->contextService()->loadCommentForPostOrFail($safeBoTable, $postIdSafe, $commentIdSafe);

        $this->permissionService()->assertCanMutate($member, $comment, $board);

        $content = $this->inputNormalizer()->content($payload);

        $this->commentGateway->updateComment($safeBoTable, $commentIdSafe, $content);
        $updated = $this->commentGateway->getComment($safeBoTable, $commentIdSafe);
        if ($updated === null) {
            throw ApiException::serverError('댓글 수정 후 조회에 실패했습니다.');
        }

        return $updated;
    }

    public function deleteComment(string $boTable, int $postId, int $commentId, array $member): void
    {
        $safeBoTable = BoTable::normalize($boTable);
        $board = $this->boardService->getBoardRow($safeBoTable);
        $this->boardService->assertGroupAccess($member, $board);
        $postIdSafe = $this->inputNormalizer()->wrId($postId);
        $commentIdSafe = $this->inputNormalizer()->wrId($commentId);

        $comment = $this->contextService()->loadCommentForPostOrFail($safeBoTable, $postIdSafe, $commentIdSafe);

        $this->permissionService()->assertCanDelete(
            $member,
            $comment,
            $board,
            $this->commentGateway->countChildComments($safeBoTable, $commentIdSafe)
        );

        $this->mutationLifecycle()->handleDeleted(
            $safeBoTable,
            $commentIdSafe,
            (string)($comment['mb_id'] ?? ''),
            (string)($board['bo_subject'] ?? ''),
            (int)($board['bo_comment_point'] ?? 0)
        );
    }

    private function contextService(): CommentContextService
    {
        return $this->resolvedContextService ??= new CommentContextService($this->postGateway, $this->commentGateway);
    }

    private function inputNormalizer(): CommentInputNormalizer
    {
        return $this->resolvedInputNormalizer ??= new CommentInputNormalizer();
    }

    private function mutationLifecycle(): CommentMutationLifecycle
    {
        return $this->resolvedMutationLifecycle ??= new CommentMutationLifecycle($this->commentGateway, $this->events);
    }

    private function permissionService(): CommentPermissionService
    {
        return $this->resolvedPermissionService ??= new CommentPermissionService($this->boardService);
    }
}
