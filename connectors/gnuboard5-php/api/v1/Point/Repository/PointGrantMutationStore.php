<?php

declare(strict_types=1);

namespace Api\Point\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;
use Throwable;

final class PointGrantMutationStore extends PointRepositorySupport
{
    public function __construct(
        private readonly PointQueryRepository $queryRepository,
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null
    ) {
        parent::__construct($qb, $tables);
    }

    public function apply(
        string $memberId,
        int $point,
        string $content,
        string $relTable,
        string $relId,
        string $relAction,
        ?int $expireDays = null
    ): void {
        if ($point === 0) {
            return;
        }

        $normalizedMemberId = trim($memberId);
        $normalizedRelTable = trim($relTable);
        $normalizedRelId = trim($relId);
        $normalizedRelAction = trim($relAction);
        if ($normalizedMemberId === '' || $normalizedRelTable === '' || $normalizedRelId === '' || $normalizedRelAction === '') {
            throw ApiException::badRequest('포인트 관계 식별자가 올바르지 않습니다.');
        }

        if ($this->queryRepository->exists($normalizedMemberId, $normalizedRelTable, $normalizedRelId, $normalizedRelAction)) {
            return;
        }

        $memberTable = $this->tables()->get('member');
        $pointTable = $this->getPointTable();
        $member = $this->fetchAssociative(
            "SELECT mb_point
             FROM {$memberTable}
             WHERE mb_id = :mb_id
             LIMIT 1",
            ['mb_id' => $normalizedMemberId]
        );

        if (!is_array($member)) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }

        $currentPoint = (int)($member['mb_point'] ?? 0);
        $nextPoint = $currentPoint + $point;
        if ($nextPoint < 0) {
            throw ApiException::forbidden('포인트가 부족합니다.');
        }

        [$poExpired, $expireDate] = $this->resolveExpiration($point, $expireDays);

        try {
            $this->queryBuilder()->beginTransaction();
            $this->executeStatement(
                "INSERT INTO {$pointTable}
                    (mb_id, po_datetime, po_content, po_point, po_use_point, po_expired, po_expire_date, po_mb_point, po_rel_table, po_rel_id, po_rel_action)
                 VALUES
                    (:mb_id, :po_datetime, :po_content, :po_point, 0, :po_expired, :po_expire_date, :po_mb_point, :po_rel_table, :po_rel_id, :po_rel_action)",
                [
                    'mb_id' => $normalizedMemberId,
                    'po_datetime' => G5DateTime::now(),
                    'po_content' => trim($content),
                    'po_point' => $point,
                    'po_expired' => $poExpired,
                    'po_expire_date' => $expireDate,
                    'po_mb_point' => $nextPoint,
                    'po_rel_table' => $normalizedRelTable,
                    'po_rel_id' => $normalizedRelId,
                    'po_rel_action' => $normalizedRelAction,
                ]
            );
            $this->executeStatement(
                "UPDATE {$memberTable}
                 SET mb_point = :mb_point
                 WHERE mb_id = :mb_id",
                [
                    'mb_id' => $normalizedMemberId,
                    'mb_point' => $nextPoint,
                ]
            );
            $this->queryBuilder()->commit();
        } catch (Throwable $exception) {
            $this->queryBuilder()->rollback();
            throw $exception;
        }
    }
}
