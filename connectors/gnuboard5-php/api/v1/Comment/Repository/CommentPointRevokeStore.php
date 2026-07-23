<?php

declare(strict_types=1);

namespace Api\Comment\Repository;

use Api\Core\Util\G5DateTime;
use Api\Support\Database\MySqlNamedLock;
use Throwable;

final class CommentPointRevokeStore extends CommentPointStoreBase
{
    public function revokeCommentPoint(string $memberId, string $boTable, int $commentId, string $boardSubject, int $point): void
    {
        $normalizedMemberId = trim($memberId);
        if ($normalizedMemberId === '' || $point === 0) {
            return;
        }

        MySqlNamedLock::withLock($this->queryBuilder(), $this->memberPointLockName($normalizedMemberId), function () use (
            $normalizedMemberId,
            $boTable,
            $commentId,
            $boardSubject
        ): void {
            $pointTable = $this->tables()->get('point');
            $memberTable = $this->tables()->get('member');
            $relId = (string)$commentId;
            $relAction = '댓글';

            $origin = $this->fetchAssociative(
                "SELECT po_point
                 FROM {$pointTable}
                 WHERE mb_id = :mb_id
                   AND po_rel_table = :po_rel_table
                   AND po_rel_id = :po_rel_id
                   AND po_rel_action = :po_rel_action
                 LIMIT 1",
                [
                    'mb_id' => $normalizedMemberId,
                    'po_rel_table' => $boTable,
                    'po_rel_id' => $relId,
                    'po_rel_action' => $relAction,
                ]
            );
            if (!is_array($origin) || !isset($origin['po_point'])) {
                return;
            }

            $alreadyReverted = $this->fetchAssociative(
                "SELECT po_id
                 FROM {$pointTable}
                 WHERE mb_id = :mb_id
                   AND po_rel_table = :po_rel_table
                   AND po_rel_id = :po_rel_id
                   AND po_rel_action = :po_rel_action
                 LIMIT 1",
                [
                    'mb_id' => $normalizedMemberId,
                    'po_rel_table' => $boTable,
                    'po_rel_id' => $relId,
                    'po_rel_action' => '댓글삭제회수',
                ]
            );
            if (is_array($alreadyReverted) && (int)($alreadyReverted['po_id'] ?? 0) > 0) {
                return;
            }

            $delta = -((int)$origin['po_point']);
            if ($delta === 0) {
                return;
            }

            $member = $this->fetchAssociative(
                "SELECT mb_point
                 FROM {$memberTable}
                 WHERE mb_id = :mb_id
                 LIMIT 1",
                ['mb_id' => $normalizedMemberId]
            );
            $currentPoint = (int)($member['mb_point'] ?? 0);
            $nextPoint = $currentPoint + $delta;

            $now = G5DateTime::now();
            $content = trim($boardSubject) . ' ' . $commentId . ' 댓글삭제';
            $poExpired = $delta < 0 ? 1 : 0;
            $expireDate = $poExpired === 1 ? G5DateTime::today() : '9999-12-31';

            try {
                $this->queryBuilder()->beginTransaction();
                $this->queryBuilder()->executeStatement(
                    "INSERT INTO {$pointTable}
                     (mb_id, po_datetime, po_content, po_point, po_use_point, po_expired, po_expire_date, po_mb_point, po_rel_table, po_rel_id, po_rel_action)
                     VALUES
                     (:mb_id, :po_datetime, :po_content, :po_point, 0, :po_expired, :po_expire_date, :po_mb_point, :po_rel_table, :po_rel_id, :po_rel_action)",
                    [
                        'mb_id' => $normalizedMemberId,
                        'po_datetime' => $now,
                        'po_content' => $content,
                        'po_point' => $delta,
                        'po_expired' => $poExpired,
                        'po_expire_date' => $expireDate,
                        'po_mb_point' => $nextPoint,
                        'po_rel_table' => $boTable,
                        'po_rel_id' => $relId,
                        'po_rel_action' => '댓글삭제회수',
                    ]
                );
                $this->queryBuilder()->executeStatement(
                    "UPDATE {$memberTable}
                     SET mb_point = :mb_point
                     WHERE mb_id = :mb_id",
                    [
                        'mb_point' => $nextPoint,
                        'mb_id' => $normalizedMemberId,
                    ]
                );
                $this->queryBuilder()->commit();
            } catch (Throwable $exception) {
                $this->queryBuilder()->rollback();
                throw $exception;
            }
        });
    }
}
