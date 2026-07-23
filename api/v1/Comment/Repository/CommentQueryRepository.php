<?php

/**
 * CommentQueryRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Comment\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Comment\Repository;

use Api\Core\DTO\CommentDTO;

final class CommentQueryRepository extends CommentRepositorySupport
{
    public function listComments(string $boTable, int $postId): array
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $postIdSafe = (int)$postId;

        $rows = $this->fetchAllAssociative(
            "SELECT
                wr_id,
                wr_parent,
                wr_comment,
                wr_comment_reply,
                wr_content,
                wr_name,
                mb_id,
                wr_datetime
            FROM {$writeTable}
            WHERE wr_parent = :wr_parent
              AND wr_is_comment = 1
            ORDER BY wr_comment ASC, wr_comment_reply ASC, wr_id ASC",
            ['wr_parent' => $postIdSafe]
        );

        return array_map(fn (array $row): array => $this->normalizeCommentRow($row), $rows);
    }

    public function getComment(string $boTable, int $commentId): ?array
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $commentIdSafe = (int)$commentId;

        $row = $this->fetchAssociative(
            "SELECT
                wr_id,
                wr_parent,
                wr_comment,
                wr_comment_reply,
                wr_content,
                wr_name,
                mb_id,
                wr_datetime
            FROM {$writeTable}
            WHERE wr_id = :wr_id
              AND wr_is_comment = 1
            LIMIT 1",
            ['wr_id' => $commentIdSafe]
        );

        if ($row === false) {
            return null;
        }

        return $this->normalizeCommentRow($row);
    }

    public function countChildComments(string $boTable, int $commentId): int
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $commentIdSafe = (int)$commentId;
        $comment = $this->fetchAssociative(
            "SELECT wr_id, wr_parent, wr_comment, wr_comment_reply
             FROM {$writeTable}
             WHERE wr_id = :wr_id
               AND wr_is_comment = 1
             LIMIT 1",
            ['wr_id' => $commentIdSafe]
        );
        if ($comment === false) {
            return 0;
        }

        $replyPrefix = (string)($comment['wr_comment_reply'] ?? '');
        $prefixLength = strlen($replyPrefix);
        $replyLike = $replyPrefix === '' ? '%' : $replyPrefix . '%';
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$writeTable}
             WHERE wr_is_comment = 1
               AND wr_parent = :wr_parent
               AND wr_comment = :wr_comment
               AND wr_id <> :wr_id
               AND wr_comment_reply LIKE :reply_like
               AND CHAR_LENGTH(wr_comment_reply) > :prefix_length",
            [
                'wr_parent' => (int)($comment['wr_parent'] ?? 0),
                'wr_comment' => (int)($comment['wr_comment'] ?? 0),
                'wr_id' => $commentIdSafe,
                'reply_like' => $replyLike,
                'prefix_length' => $prefixLength,
            ]
        );

        return (int)($row['cnt'] ?? 0);
    }

    public function getLastCommentWriteTime(string $boTable, string $memberId): ?string
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $memberId = trim($memberId);
        if ($memberId === '') {
            return null;
        }

        $row = $this->fetchAssociative(
            "SELECT MAX(wr_datetime) AS wr_datetime
             FROM {$writeTable}
             WHERE wr_is_comment = 1
               AND mb_id = :mb_id",
            ['mb_id' => $memberId]
        );

        $datetime = trim((string)($row['wr_datetime'] ?? ''));

        return $datetime === '' ? null : $datetime;
    }

    private function normalizeCommentRow(array $row): array
    {
        $data = CommentDTO::fromRow($row)->jsonSerialize();
        $data['mb_id'] = (string)($data['mb_id'] ?? '');
        $data['wr_datetime'] = (string)($data['wr_datetime'] ?? '');

        return $data;
    }
}
