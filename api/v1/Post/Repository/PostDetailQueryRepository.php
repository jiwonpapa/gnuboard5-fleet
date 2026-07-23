<?php

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Support\Exception\ApiException;

final class PostDetailQueryRepository extends PostQuerySupport
{
    /**
     * @return array<string,mixed>|null
     */
    public function getPost(string $boTable, int $wrId): ?array
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $wrIdSafe = (int)$wrId;

        $row = $this->fetchAssociative(
            "SELECT
                wr_id,
                wr_parent,
                wr_num,
                wr_reply,
                wr_subject,
                wr_content,
                wr_name,
                mb_id,
                wr_datetime,
                wr_last,
                wr_hit,
                wr_good,
                wr_nogood,
                wr_comment,
                ca_name,
                wr_option,
                wr_password,
                wr_link1,
                wr_link2,
                wr_link1_hit,
                wr_link2_hit,
                wr_is_comment
             FROM {$writeTable}
             WHERE wr_id = :wr_id AND wr_is_comment = 0
             LIMIT 1",
            ['wr_id' => $wrIdSafe]
        );

        if ($row === false) {
            return null;
        }

        $post = $this->normalizePostRow($row);
        $board = $this->boardRepository->findBoard($boTable) ?? [];
        $noticeIds = $this->parseNoticeIds((string)($board['bo_notice'] ?? ''));
        $post['is_notice'] = in_array((int)$post['wr_id'], $noticeIds, true);

        return $post;
    }

    /**
     * @return array<int, array{wr_id:int,mb_id:string}>
     */
    public function listCommentsForPost(string $boTable, int $wrId): array
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $rows = $this->fetchAllAssociative(
            "SELECT wr_id, mb_id
             FROM {$writeTable}
             WHERE wr_parent = :wr_parent
               AND wr_is_comment = 1
             ORDER BY wr_id ASC",
            ['wr_parent' => (int)$wrId]
        );

        return array_map(
            static fn (array $row): array => [
                'wr_id' => (int)($row['wr_id'] ?? 0),
                'mb_id' => trim((string)($row['mb_id'] ?? '')),
            ],
            $rows
        );
    }

    public function countReplies(string $boTable, int $wrId): int
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $wrIdSafe = (int)$wrId;
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$writeTable}
             WHERE wr_parent = :wr_parent
               AND wr_is_comment = 0
               AND wr_id <> :wr_id",
            [
                'wr_parent' => $wrIdSafe,
                'wr_id' => $wrIdSafe,
            ]
        );

        return (int)($row['cnt'] ?? 0);
    }

    public function countOtherMemberComments(string $boTable, int $wrId, string $excludeMbId): int
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$writeTable}
             WHERE wr_parent = :wr_parent
               AND wr_is_comment = 1
               AND (mb_id <> :exclude_mb_id OR mb_id = '')",
            [
                'wr_parent' => (int)$wrId,
                'exclude_mb_id' => trim($excludeMbId),
            ]
        );

        return (int)($row['cnt'] ?? 0);
    }

    public function getLastWriteTime(string $boTable, string $memberId): ?string
    {
        $memberIdSafe = trim($memberId);
        if ($memberIdSafe === '') {
            return null;
        }

        $row = $this->fetchAssociative(
            "SELECT MAX(wr_datetime) AS wr_datetime
             FROM {$this->boardRepository->getWriteTable($boTable)}
             WHERE wr_is_comment = 0
               AND mb_id = :mb_id",
            ['mb_id' => $memberIdSafe]
        );

        $datetime = trim((string)($row['wr_datetime'] ?? ''));

        return $datetime === '' ? null : $datetime;
    }

    public function increaseLinkHit(string $boTable, int $wrId, int $linkNo): ?string
    {
        if (!in_array($linkNo, [1, 2], true)) {
            throw ApiException::badRequest('link_no는 1 또는 2만 가능합니다.');
        }

        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $field = $linkNo === 1 ? 'wr_link1' : 'wr_link2';
        $hitField = $field . '_hit';
        $wrIdSafe = (int)$wrId;

        $row = $this->fetchAssociative(
            "SELECT {$field} AS wr_link
             FROM {$writeTable}
             WHERE wr_id = :wr_id
               AND wr_is_comment = 0
             LIMIT 1",
            ['wr_id' => $wrIdSafe]
        );
        if (!is_array($row)) {
            return null;
        }

        $url = trim((string)($row['wr_link'] ?? ''));
        if ($url === '') {
            return null;
        }

        $this->executeStatement(
            "UPDATE {$writeTable}
             SET {$hitField} = {$hitField} + 1
             WHERE wr_id = :wr_id
               AND wr_is_comment = 0",
            ['wr_id' => $wrIdSafe]
        );

        return $url;
    }
}
