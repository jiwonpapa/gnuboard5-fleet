<?php

/**
 * CommentBoardActivityStore API module.
 *
 * @package  Gnuboard5\Api\v1\Comment\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Comment\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\Util\G5DateTime;
use Api\Integration\Contracts\BoardGateway;

final class CommentBoardActivityStore extends CommentRepositorySupport
{
    public function __construct(
        BoardGateway $boardRepository,
        ?QueryBuilder $qb,
        ?TableRegistry $tables
    ) {
        parent::__construct($boardRepository, $qb, $tables);
    }

    public function insertBoardNew(string $boTable, int $commentId, int $postId, string $memberId): void
    {
        $boardNewTable = $this->tables()->get('board_new');
        $this->executeStatement(
            "INSERT INTO {$boardNewTable} (bo_table, wr_id, wr_parent, bn_datetime, mb_id)
             VALUES (:bo_table, :wr_id, :wr_parent, :bn_datetime, :mb_id)",
            [
                'bo_table' => $boTable,
                'wr_id' => (int)$commentId,
                'wr_parent' => (int)$postId,
                'bn_datetime' => G5DateTime::now(),
                'mb_id' => trim($memberId),
            ]
        );
    }

    public function deleteBoardNew(string $boTable, int $commentId): void
    {
        $boardNewTable = $this->tables()->get('board_new');
        $this->executeStatement(
            "DELETE FROM {$boardNewTable}
             WHERE bo_table = :bo_table
               AND wr_id = :wr_id",
            [
                'bo_table' => $boTable,
                'wr_id' => (int)$commentId,
            ]
        );
    }

    public function incrementBoardCommentCount(string $boTable): void
    {
        $boardTable = $this->boardRepository->getBoardTable();
        $this->executeStatement(
            "UPDATE {$boardTable}
             SET bo_count_comment = bo_count_comment + 1
             WHERE bo_table = :bo_table",
            ['bo_table' => $boTable]
        );
    }

    public function decrementBoardCommentCount(string $boTable): void
    {
        $boardTable = $this->boardRepository->getBoardTable();
        $this->executeStatement(
            "UPDATE {$boardTable}
             SET bo_count_comment = GREATEST(bo_count_comment - 1, 0)
             WHERE bo_table = :bo_table",
            ['bo_table' => $boTable]
        );
    }
}
