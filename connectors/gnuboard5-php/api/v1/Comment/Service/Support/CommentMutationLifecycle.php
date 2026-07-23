<?php

declare(strict_types=1);

namespace Api\Comment\Service\Support;

use Api\Comment\Contracts\CommentGateway;
use Api\Core\Plugin\EventDispatcher;
use Api\Support\Exception\ApiException;

final readonly class CommentMutationLifecycle
{
    public function __construct(
        private CommentGateway $commentGateway,
        private EventDispatcher $events
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function handleCreated(
        string $boTable,
        int $postId,
        int $commentId,
        string $memberId,
        int $commentPoint,
        string $boardSubject
    ): array {
        $this->commentGateway->grantCommentPoint(
            $memberId,
            $boTable,
            $postId,
            $commentId,
            $commentPoint,
            $boardSubject
        );
        $this->commentGateway->insertBoardNew($boTable, $commentId, $postId, $memberId);
        $this->commentGateway->incrementBoardCommentCount($boTable);

        $comment = $this->commentGateway->getComment($boTable, $commentId);
        if ($comment === null) {
            throw ApiException::serverError('생성된 댓글 조회에 실패했습니다.');
        }

        if ($commentPoint !== 0) {
            $this->events->dispatch('point.added', [
                'member_id' => $memberId,
                'amount' => $commentPoint,
                'reason' => $boardSubject . ' ' . $commentId . ' 댓글',
                'rel_table' => $boTable,
                'rel_id' => (string)$commentId,
                'action' => '댓글',
            ]);
        }

        $this->events->dispatch('comment.created', [
            'comment_id' => $commentId,
            'post_id' => $postId,
            'board_id' => $boTable,
            'member_id' => $memberId,
            'data' => $comment,
        ]);

        return $comment;
    }

    public function handleDeleted(
        string $boTable,
        int $commentId,
        string $memberId,
        string $boardSubject,
        int $commentPoint
    ): void {
        $this->commentGateway->revokeCommentPoint(
            $memberId,
            $boTable,
            $commentId,
            $boardSubject,
            $commentPoint
        );
        $this->commentGateway->deleteBoardNew($boTable, $commentId);
        $this->commentGateway->decrementBoardCommentCount($boTable);
        $this->commentGateway->deleteComment($boTable, $commentId);
    }
}
