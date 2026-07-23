<?php

/**
 * PointDeleteStore API module.
 *
 * @package  Gnuboard5\Api\v1\Point\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Point\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Database\MySqlNamedLock;
use Api\Support\Exception\ApiException;
use Throwable;

final class PointDeleteStore extends PointRepositorySupport
{
    public function __construct(
        private readonly PointQueryRepository $queryRepository,
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null
    ) {
        parent::__construct($qb, $tables);
    }

    public function deleteById(int $poId, string $memberId): void
    {
        $poIdSafe = max(0, $poId);
        $normalizedMemberId = trim($memberId);
        if ($poIdSafe <= 0 || $normalizedMemberId === '') {
            throw ApiException::badRequest('삭제 대상 포인트 정보가 올바르지 않습니다.');
        }

        MySqlNamedLock::withLock(
            $this->queryBuilder(),
            $this->memberPointLockName($normalizedMemberId),
            function () use ($poIdSafe, $normalizedMemberId): void {
                $pointTable = $this->getPointTable();
                $memberTable = $this->tables()->get('member');
                $target = $this->fetchAssociative(
                    "SELECT po_id
                     FROM {$pointTable}
                     WHERE po_id = :po_id
                       AND mb_id = :mb_id
                     LIMIT 1",
                    [
                        'po_id' => $poIdSafe,
                        'mb_id' => $normalizedMemberId,
                    ]
                );

                if (!is_array($target)) {
                    throw ApiException::notFound('삭제할 포인트 내역이 없습니다.');
                }

                try {
                    $this->queryBuilder()->beginTransaction();
                    $this->executeStatement(
                        "DELETE FROM {$pointTable}
                         WHERE po_id = :po_id
                           AND mb_id = :mb_id",
                        [
                            'po_id' => $poIdSafe,
                            'mb_id' => $normalizedMemberId,
                        ]
                    );

                    $sum = $this->queryRepository->sumMemberPoints($normalizedMemberId);
                    $this->executeStatement(
                        "UPDATE {$memberTable}
                         SET mb_point = :mb_point
                         WHERE mb_id = :mb_id",
                        [
                            'mb_id' => $normalizedMemberId,
                            'mb_point' => $sum,
                        ]
                    );
                    $this->queryBuilder()->commit();
                } catch (Throwable $exception) {
                    $this->queryBuilder()->rollback();
                    throw $exception;
                }
            }
        );
    }

    private function memberPointLockName(string $memberId): string
    {
        return 'point:member:' . $memberId;
    }
}
