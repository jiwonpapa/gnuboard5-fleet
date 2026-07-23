<?php

/**
 * PointMaintenanceRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Point\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Point\Repository;

final class PointMaintenanceRepository extends PointRepositorySupport
{
    public function __construct(
        private readonly PointQueryRepository $queryRepository,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null
    ) {
        parent::__construct($qb, $tables);
    }

    public function syncTotal(string $memberId): void
    {
        $normalizedMemberId = trim($memberId);
        if ($normalizedMemberId === '') {
            return;
        }

        $memberTable = $this->tables()->get('member');
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
    }

    public function expirePoints(?string $today = null): array
    {
        $pointTable = $this->getPointTable();
        $baseDate = $this->normalizeDate($today);

        $members = $this->fetchAllAssociative(
            "SELECT DISTINCT mb_id
             FROM {$pointTable}
             WHERE po_expired = 0
               AND po_expire_date < :today
               AND mb_id <> ''",
            ['today' => $baseDate]
        );

        $expiredCount = $this->executeStatement(
            "UPDATE {$pointTable}
             SET po_expired = 1
             WHERE po_expired = 0
               AND po_expire_date < :today",
            ['today' => $baseDate]
        );

        $syncedMembers = 0;
        foreach ($members as $member) {
            $memberId = trim((string)($member['mb_id'] ?? ''));
            if ($memberId === '') {
                continue;
            }

            $this->syncTotal($memberId);
            $syncedMembers++;
        }

        return [
            'base_date' => $baseDate,
            'expired_count' => $expiredCount,
            'synced_members' => $syncedMembers,
        ];
    }
}
