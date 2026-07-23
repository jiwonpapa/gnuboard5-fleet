<?php

declare(strict_types=1);

namespace Api\Memo\Repository;

final class MemoDetailQueryRepository extends MemoRepositorySupport
{
    public function getById(int $meId, string $memberId, string $kind): ?array
    {
        [$normalizedKind, $ownerColumn, $counterpartColumn] = $this->resolveKindColumns($kind);
        $memoTable = $this->tables()->get('memo');
        $memberTable = $this->tables()->get('member');

        $row = $this->fetchAssociative(
            "SELECT
                m.me_id,
                m.me_recv_mb_id,
                m.me_send_mb_id,
                m.me_send_datetime,
                m.me_read_datetime,
                m.me_memo,
                m.me_send_id,
                m.me_type,
                m.me_send_ip,
                u.mb_id AS counterpart_mb_id,
                u.mb_nick AS counterpart_mb_nick
             FROM {$memoTable} m
             LEFT JOIN {$memberTable} u ON u.mb_id = m.{$counterpartColumn}
             WHERE m.me_id = :me_id
               AND m.{$ownerColumn} = :mb_id
               AND m.me_type = :kind
             LIMIT 1",
            [
                'me_id' => max(0, $meId),
                'mb_id' => trim($memberId),
                'kind' => $normalizedKind,
            ]
        );

        if (!is_array($row)) {
            return null;
        }

        return $this->normalizeMemoRow($row);
    }

    public function countUnread(string $memberId): int
    {
        $memoTable = $this->tables()->get('memo');
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$memoTable}
             WHERE me_recv_mb_id = :mb_id
               AND me_type = 'recv'
               AND (
                    me_read_datetime IS NULL
                    OR CAST(me_read_datetime AS CHAR(19)) = ''
                    OR CAST(me_read_datetime AS CHAR(19)) = '" . self::UNREAD_DATETIME . "'
                    OR CAST(me_read_datetime AS CHAR(19)) = '" . self::LEGACY_UNREAD_DATETIME . "'
               )",
            [
                'mb_id' => trim($memberId),
            ]
        );

        return (int)($row['cnt'] ?? 0);
    }
}
