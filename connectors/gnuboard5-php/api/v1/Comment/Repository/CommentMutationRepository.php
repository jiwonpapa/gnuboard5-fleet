<?php

/**
 * CommentMutationRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Comment\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Comment\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Integration\Contracts\BoardGateway;

final class CommentMutationRepository extends CommentRepositorySupport
{
    private readonly CommentThreadRepository $threadRepository;
    private ?CommentEntryMutationStore $resolvedEntryStore = null;
    private ?CommentBoardActivityStore $resolvedBoardActivityStore = null;

    public function __construct(
        BoardGateway $boardRepository,
        QueryBuilder $qb,
        TableRegistry $tables,
        CommentThreadRepository $threadRepository,
        ?CommentEntryMutationStore $entryStore = null,
        ?CommentBoardActivityStore $boardActivityStore = null
    ) {
        parent::__construct($boardRepository, $qb, $tables);
        $this->threadRepository = $threadRepository;
        $this->resolvedEntryStore = $entryStore;
        $this->resolvedBoardActivityStore = $boardActivityStore;
    }

    public function createComment(
        string $boTable,
        int $postId,
        array $member,
        string $content,
        ?int $parentCommentId,
        string $ip
    ): int {
        return $this->entryStore()->createComment($boTable, $postId, $member, $content, $parentCommentId, $ip);
    }

    public function updateComment(string $boTable, int $commentId, string $content): void
    {
        $this->entryStore()->updateComment($boTable, $commentId, $content);
    }

    public function deleteComment(string $boTable, int $commentId): void
    {
        $this->entryStore()->deleteComment($boTable, $commentId);
    }

    public function insertBoardNew(string $boTable, int $commentId, int $postId, string $memberId): void
    {
        $this->boardActivityStore()->insertBoardNew($boTable, $commentId, $postId, $memberId);
    }

    public function deleteBoardNew(string $boTable, int $commentId): void
    {
        $this->boardActivityStore()->deleteBoardNew($boTable, $commentId);
    }

    public function incrementBoardCommentCount(string $boTable): void
    {
        $this->boardActivityStore()->incrementBoardCommentCount($boTable);
    }

    public function decrementBoardCommentCount(string $boTable): void
    {
        $this->boardActivityStore()->decrementBoardCommentCount($boTable);
    }

    private function entryStore(): CommentEntryMutationStore
    {
        if ($this->resolvedEntryStore instanceof CommentEntryMutationStore) {
            return $this->resolvedEntryStore;
        }

        $this->resolvedEntryStore = new CommentEntryMutationStore(
            $this->boardRepository,
            $this->queryBuilder(),
            $this->tables(),
            $this->threadRepository
        );

        return $this->resolvedEntryStore;
    }

    private function boardActivityStore(): CommentBoardActivityStore
    {
        if ($this->resolvedBoardActivityStore instanceof CommentBoardActivityStore) {
            return $this->resolvedBoardActivityStore;
        }

        $this->resolvedBoardActivityStore = new CommentBoardActivityStore(
            $this->boardRepository,
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->resolvedBoardActivityStore;
    }
}
