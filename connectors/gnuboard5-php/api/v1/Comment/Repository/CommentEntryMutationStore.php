<?php

/**
 * CommentEntryMutationStore API module.
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
use Api\Support\Exception\ApiException;

final class CommentEntryMutationStore extends CommentRepositorySupport
{
    public function __construct(
        BoardGateway $boardRepository,
        ?QueryBuilder $qb,
        ?TableRegistry $tables,
        private readonly CommentThreadRepository $threadRepository
    ) {
        parent::__construct($boardRepository, $qb, $tables);
    }

    public function createComment(
        string $boTable,
        int $postId,
        array $member,
        string $content,
        ?int $parentCommentId,
        string $ip
    ): int {
        $writeTable = $this->boardRepository->getWriteTable($boTable);

        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 사용자 정보가 없습니다.');
        }

        $memberName = trim((string)($member['mb_name'] ?? ($member['mb_nick'] ?? '')));
        $memberEmail = trim((string)($member['mb_email'] ?? ''));

        $postIdSafe = (int)$postId;
        $contentSafe = trim($content);
        $ipSafe = trim($ip);
        $categoryName = $this->resolvePostCategory($writeTable, $postIdSafe);
        $wrNum = $this->threadRepository->resolvePostWrNum($writeTable, $postIdSafe);
        ['wr_comment' => $wrComment, 'wr_comment_reply' => $wrCommentReply] = $this->threadRepository->resolveCommentThread(
            $writeTable,
            $postIdSafe,
            $parentCommentId
        );

        $now = G5DateTime::now();

        $sql = <<<SQL
INSERT INTO {$writeTable} (
    wr_num, wr_reply, wr_parent, wr_is_comment, wr_comment, wr_comment_reply,
    ca_name, wr_option, wr_subject, wr_content, wr_seo_title, wr_link1, wr_link2, wr_link1_hit, wr_link2_hit,
    wr_hit, wr_good, wr_nogood, mb_id, wr_password, wr_name, wr_email, wr_homepage,
    wr_datetime, wr_last, wr_ip, wr_facebook_user, wr_twitter_user,
    wr_1, wr_2, wr_3, wr_4, wr_5, wr_6, wr_7, wr_8, wr_9, wr_10
) VALUES (
    :wr_num, '', :wr_parent, 1, :wr_comment, :wr_comment_reply,
    :ca_name, '', '', :wr_content, '', '', '', 0, 0,
    0, 0, 0, :mb_id, '', :wr_name, :wr_email, '',
    :wr_datetime, :wr_last, :wr_ip, '', '',
    '', '', '', '', '', '', '', '', '', ''
)
SQL;

        $this->executeStatement($sql, [
            'wr_num' => $wrNum,
            'wr_parent' => $postIdSafe,
            'wr_comment' => $wrComment,
            'wr_comment_reply' => $wrCommentReply,
            'ca_name' => $categoryName,
            'wr_content' => $contentSafe,
            'mb_id' => $memberId,
            'wr_name' => $memberName,
            'wr_email' => $memberEmail,
            'wr_datetime' => $now,
            'wr_last' => $now,
            'wr_ip' => $ipSafe,
        ]);
        $commentId = $this->lastInsertId();
        if ($commentId <= 0) {
            throw ApiException::serverError('댓글 생성에 실패했습니다.');
        }

        $this->threadRepository->increaseCommentCount($boTable, $postIdSafe);

        return $commentId;
    }

    public function updateComment(string $boTable, int $commentId, string $content): void
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $commentIdSafe = (int)$commentId;
        $this->executeStatement(
            "UPDATE {$writeTable}
             SET wr_content = :wr_content
             WHERE wr_id = :wr_id
               AND wr_is_comment = 1",
            [
                'wr_content' => trim($content),
                'wr_id' => $commentIdSafe,
            ]
        );
    }

    public function deleteComment(string $boTable, int $commentId): void
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $commentIdSafe = (int)$commentId;
        $goodTable = $this->tables()->get('board_good');

        $comment = $this->fetchAssociative(
            "SELECT wr_parent
             FROM {$writeTable}
             WHERE wr_id = :wr_id
               AND wr_is_comment = 1
             LIMIT 1",
            ['wr_id' => $commentIdSafe]
        );
        if (is_array($comment)) {
            $postId = (int)($comment['wr_parent'] ?? 0);
            if ($postId > 0) {
                $this->threadRepository->decreaseCommentCount($boTable, $postId, $commentIdSafe);
            }
        }

        $this->executeStatement(
            "DELETE FROM {$writeTable} WHERE wr_id = :wr_id AND wr_is_comment = 1",
            ['wr_id' => $commentIdSafe]
        );
        $this->executeStatement(
            "DELETE FROM {$goodTable} WHERE bo_table = :bo_table AND wr_id = :wr_id",
            [
                'bo_table' => $boTable,
                'wr_id' => $commentIdSafe,
            ]
        );
    }

    private function resolvePostCategory(string $writeTable, int $postId): string
    {
        $row = $this->fetchAssociative(
            "SELECT ca_name
             FROM {$writeTable}
             WHERE wr_id = :wr_id
             LIMIT 1",
            ['wr_id' => $postId]
        );

        if (!is_array($row)) {
            return '';
        }

        return trim((string)($row['ca_name'] ?? ''));
    }
}
