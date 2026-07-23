<?php

declare(strict_types=1);

namespace Api\Comment\Repository;

use Api\Core\Util\G5DateTime;
use Api\Support\Database\MySqlNamedLock;
use Api\Support\Exception\ApiException;
use Throwable;

final class CommentPointGrantStore extends CommentPointStoreBase
{
    public function grantCommentPoint(
        string $memberId,
        string $boTable,
        int $postId,
        int $commentId,
        int $point,
        string $boardSubject
    ): void {
        $normalizedMemberId = trim($memberId);
        if ($normalizedMemberId === '' || $point === 0) {
            return;
        }

        MySqlNamedLock::withLock($this->queryBuilder(), $this->memberPointLockName($normalizedMemberId), function () use (
            $normalizedMemberId,
            $boTable,
            $postId,
            $commentId,
            $point,
            $boardSubject
        ): void {
            $pointTable = $this->tables()->get('point');
            $memberTable = $this->tables()->get('member');
            $relId = (string)$commentId;
            $relAction = '댓글';

            $existing = $this->fetchAssociative(
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
                    'po_rel_action' => $relAction,
                ]
            );
            if (is_array($existing) && (int)($existing['po_id'] ?? 0) > 0) {
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
            $nextPoint = $currentPoint + $point;
            if ($nextPoint < 0) {
                throw ApiException::forbidden('포인트가 부족하여 댓글을 작성할 수 없습니다.');
            }

            $poExpired = $point < 0 ? 1 : 0;
            $expireDate = $poExpired === 1 ? G5DateTime::today() : '9999-12-31';
            $now = G5DateTime::now();
            $content = trim($boardSubject) . ' ' . $postId . ' 댓글';

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
                        'po_point' => $point,
                        'po_expired' => $poExpired,
                        'po_expire_date' => $expireDate,
                        'po_mb_point' => $nextPoint,
                        'po_rel_table' => $boTable,
                        'po_rel_id' => $relId,
                        'po_rel_action' => $relAction,
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
