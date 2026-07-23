<?php

/**
 * CommentThreadRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Comment\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Comment\Repository;

use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;

final class CommentThreadRepository extends CommentRepositorySupport
{
    public function resolvePostWrNum(string $writeTable, int $postId): int
    {
        $post = $this->fetchAssociative(
            "SELECT wr_num
             FROM {$writeTable}
             WHERE wr_id = :wr_id
               AND wr_is_comment = 0
             LIMIT 1",
            ['wr_id' => $postId]
        );
        if (!is_array($post) || !array_key_exists('wr_num', $post)) {
            throw ApiException::notFound('원글을 찾을 수 없습니다.');
        }

        return (int)$post['wr_num'];
    }

    /**
     * @return array{wr_comment:int,wr_comment_reply:string}
     */
    public function resolveCommentThread(string $writeTable, int $postId, ?int $parentCommentId): array
    {
        if ($parentCommentId === null) {
            $row = $this->fetchAssociative(
                "SELECT IFNULL(MAX(wr_comment), 0) + 1 AS next_comment
                 FROM {$writeTable}
                 WHERE wr_parent = :wr_parent
                   AND wr_is_comment = 1",
                ['wr_parent' => $postId]
            );

            return [
                'wr_comment' => (int)($row['next_comment'] ?? 1),
                'wr_comment_reply' => '',
            ];
        }

        $parent = $this->fetchAssociative(
            "SELECT wr_comment, wr_comment_reply
             FROM {$writeTable}
             WHERE wr_id = :wr_id
               AND wr_parent = :wr_parent
               AND wr_is_comment = 1
             LIMIT 1",
            [
                'wr_id' => (int)$parentCommentId,
                'wr_parent' => $postId,
            ]
        );
        if (!is_array($parent)) {
            throw ApiException::notFound('parent_comment_id가 유효하지 않습니다.');
        }

        $parentReply = strtoupper(trim((string)($parent['wr_comment_reply'] ?? '')));
        if ($parentReply !== '' && !preg_match('/^[A-Z]+$/', $parentReply)) {
            throw ApiException::serverError('댓글 계층 데이터가 손상되었습니다.');
        }
        if (strlen($parentReply) >= 10) {
            throw ApiException::badRequest('댓글 답변 깊이는 최대 10단계입니다.');
        }

        $childLength = strlen($parentReply) + 1;
        $row = $this->fetchAssociative(
            "SELECT MAX(wr_comment_reply) AS max_reply
             FROM {$writeTable}
             WHERE wr_parent = :wr_parent
               AND wr_is_comment = 1
               AND wr_comment = :wr_comment
               AND wr_comment_reply LIKE :reply_like
               AND CHAR_LENGTH(wr_comment_reply) = :reply_length",
            [
                'wr_parent' => $postId,
                'wr_comment' => (int)($parent['wr_comment'] ?? 0),
                'reply_like' => $parentReply . '_',
                'reply_length' => $childLength,
            ]
        );

        $maxReply = strtoupper(trim((string)($row['max_reply'] ?? '')));
        $nextChar = 'A';
        if ($maxReply !== '') {
            $lastChar = substr($maxReply, -1);
            $nextChar = chr(ord($lastChar) + 1);
            if ($nextChar > 'Z') {
                throw ApiException::badRequest('더 이상 답변 댓글을 등록할 수 없습니다.');
            }
        }

        return [
            'wr_comment' => (int)($parent['wr_comment'] ?? 0),
            'wr_comment_reply' => $parentReply . $nextChar,
        ];
    }

    public function increaseCommentCount(string $boTable, int $postId): void
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $postIdSafe = (int)$postId;
        $now = G5DateTime::now();

        $this->executeStatement(
            "UPDATE {$writeTable}
                SET wr_comment = wr_comment + 1
                  , wr_last = :wr_last
                WHERE wr_id = :wr_id AND wr_is_comment = 0",
            [
                'wr_last' => $now,
                'wr_id' => $postIdSafe,
            ]
        );
    }

    public function decreaseCommentCount(string $boTable, int $postId, int $excludeCommentId): void
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $postIdSafe = (int)$postId;
        $excludeIdSafe = (int)$excludeCommentId;
        $latestComment = $this->fetchAssociative(
            "SELECT MAX(wr_datetime) AS wr_last
             FROM {$writeTable}
             WHERE wr_parent = :wr_parent
               AND wr_is_comment = 1
               AND wr_id <> :wr_id",
            [
                'wr_parent' => $postIdSafe,
                'wr_id' => $excludeIdSafe,
            ]
        );
        $wrLast = trim((string)($latestComment['wr_last'] ?? ''));
        if ($wrLast === '') {
            $post = $this->fetchAssociative(
                "SELECT wr_datetime
                 FROM {$writeTable}
                 WHERE wr_id = :wr_id
                   AND wr_is_comment = 0
                 LIMIT 1",
                ['wr_id' => $postIdSafe]
            );
            $wrLast = (string)($post['wr_datetime'] ?? G5DateTime::now());
        }

        $this->executeStatement(
            "UPDATE {$writeTable}
                SET wr_comment = GREATEST(wr_comment - 1, 0)
                  , wr_last = :wr_last
                WHERE wr_id = :wr_id AND wr_is_comment = 0",
            [
                'wr_last' => $wrLast,
                'wr_id' => $postIdSafe,
            ]
        );
    }
}
