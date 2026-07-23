<?php

/**
 * MemoSendStore API module.
 *
 * @package  Gnuboard5\Api\v1\Memo\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Memo\Repository;

use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;
use Throwable;

final class MemoSendStore extends MemoRepositorySupport
{
    public function send(string $sendMbId, string $recvMbId, string $memo, string $ip): int
    {
        $memoTable = $this->tables()->get('memo');
        $now = G5DateTime::now();
        $sendId = trim($sendMbId);
        $recvId = trim($recvMbId);

        try {
            $this->queryBuilder()->beginTransaction();
            $this->executeStatement(
                "INSERT INTO {$memoTable}
                    (me_recv_mb_id, me_send_mb_id, me_send_datetime, me_memo, me_read_datetime, me_type, me_send_ip)
                 VALUES
                    (:me_recv_mb_id, :me_send_mb_id, :me_send_datetime, :me_memo, :me_read_datetime, 'recv', :me_send_ip)",
                [
                    'me_recv_mb_id' => $recvId,
                    'me_send_mb_id' => $sendId,
                    'me_send_datetime' => $now,
                    'me_memo' => $memo,
                    'me_read_datetime' => self::UNREAD_DATETIME,
                    'me_send_ip' => trim($ip),
                ]
            );

            $recvMemoId = $this->lastInsertId();
            if ($recvMemoId <= 0) {
                throw ApiException::serverError('쪽지 저장에 실패했습니다.');
            }

            $this->executeStatement(
                "INSERT INTO {$memoTable}
                    (me_recv_mb_id, me_send_mb_id, me_send_datetime, me_memo, me_read_datetime, me_send_id, me_type, me_send_ip)
                 VALUES
                    (:me_recv_mb_id, :me_send_mb_id, :me_send_datetime, :me_memo, :me_read_datetime, :me_send_id, 'send', :me_send_ip)",
                [
                    'me_recv_mb_id' => $recvId,
                    'me_send_mb_id' => $sendId,
                    'me_send_datetime' => $now,
                    'me_memo' => $memo,
                    'me_read_datetime' => self::UNREAD_DATETIME,
                    'me_send_id' => $recvMemoId,
                    'me_send_ip' => trim($ip),
                ]
            );

            $this->queryBuilder()->commit();
        } catch (Throwable $exception) {
            $this->queryBuilder()->rollback();
            throw $exception;
        }

        return $recvMemoId;
    }
}
