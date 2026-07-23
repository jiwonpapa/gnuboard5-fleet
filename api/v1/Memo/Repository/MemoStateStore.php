<?php

/**
 * MemoStateStore API module.
 *
 * @package  Gnuboard5\Api\v1\Memo\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Memo\Repository;

use Api\Core\Util\G5DateTime;

final class MemoStateStore extends MemoRepositorySupport
{
    public function markAsRead(int $meId, string $memberId): void
    {
        if ($meId <= 0 || trim($memberId) === '') {
            return;
        }

        $memoTable = $this->tables()->get('memo');
        $this->executeStatement(
            "UPDATE {$memoTable}
             SET me_read_datetime = :me_read_datetime
             WHERE (me_id = :me_id OR me_send_id = :me_id)
               AND me_recv_mb_id = :mb_id
               AND (
                    me_read_datetime IS NULL
                    OR CAST(me_read_datetime AS CHAR(19)) = ''
                    OR CAST(me_read_datetime AS CHAR(19)) = '" . self::UNREAD_DATETIME . "'
                    OR CAST(me_read_datetime AS CHAR(19)) = '" . self::LEGACY_UNREAD_DATETIME . "'
               )",
            [
                'me_read_datetime' => G5DateTime::now(),
                'me_id' => $meId,
                'mb_id' => trim($memberId),
            ]
        );
    }

    /**
     * @return array<string,mixed>|null
     */
    public function delete(int $meId, string $memberId): ?array
    {
        if ($meId <= 0 || trim($memberId) === '') {
            return null;
        }

        $memoTable = $this->tables()->get('memo');
        $row = $this->fetchAssociative(
            "SELECT
                me_id,
                me_recv_mb_id,
                me_send_mb_id,
                me_send_datetime,
                me_read_datetime,
                me_memo,
                me_send_id,
                me_type,
                me_send_ip
             FROM {$memoTable}
             WHERE me_id = :me_id
               AND (me_recv_mb_id = :mb_id OR me_send_mb_id = :mb_id)
             LIMIT 1",
            [
                'me_id' => $meId,
                'mb_id' => trim($memberId),
            ]
        );

        if (!is_array($row)) {
            return null;
        }

        $this->executeStatement(
            "DELETE FROM {$memoTable}
             WHERE me_id = :me_id
               AND (me_recv_mb_id = :mb_id OR me_send_mb_id = :mb_id)",
            [
                'me_id' => $meId,
                'mb_id' => trim($memberId),
            ]
        );

        return $this->normalizeMemoRow($row);
    }
}
