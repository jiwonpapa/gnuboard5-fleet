<?php

/**
 * CommentPointRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Comment\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Comment\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Integration\Contracts\BoardGateway;

final class CommentPointRepository extends CommentPointStoreBase
{
    private ?CommentPointGrantStore $resolvedGrantStore = null;
    private ?CommentPointRevokeStore $resolvedRevokeStore = null;

    public function __construct(
        BoardGateway $boardRepository,
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?CommentPointGrantStore $grantStore = null,
        ?CommentPointRevokeStore $revokeStore = null
    ) {
        parent::__construct($boardRepository, $qb, $tables);
        $this->resolvedGrantStore = $grantStore;
        $this->resolvedRevokeStore = $revokeStore;
    }

    public function grantCommentPoint(
        string $memberId,
        string $boTable,
        int $postId,
        int $commentId,
        int $point,
        string $boardSubject
    ): void {
        $this->grantStore()->grantCommentPoint($memberId, $boTable, $postId, $commentId, $point, $boardSubject);
    }

    public function revokeCommentPoint(string $memberId, string $boTable, int $commentId, string $boardSubject, int $point): void
    {
        $this->revokeStore()->revokeCommentPoint($memberId, $boTable, $commentId, $boardSubject, $point);
    }

    private function grantStore(): CommentPointGrantStore
    {
        if ($this->resolvedGrantStore instanceof CommentPointGrantStore) {
            return $this->resolvedGrantStore;
        }

        $this->resolvedGrantStore = new CommentPointGrantStore($this->boardRepository, $this->queryBuilder(), $this->tables());

        return $this->resolvedGrantStore;
    }

    private function revokeStore(): CommentPointRevokeStore
    {
        if ($this->resolvedRevokeStore instanceof CommentPointRevokeStore) {
            return $this->resolvedRevokeStore;
        }

        $this->resolvedRevokeStore = new CommentPointRevokeStore($this->boardRepository, $this->queryBuilder(), $this->tables());

        return $this->resolvedRevokeStore;
    }
}
