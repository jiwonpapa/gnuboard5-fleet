<?php

declare(strict_types=1);

namespace Api\Point\Repository;

final class PointSummaryQueryRepository extends PointRepositorySupport
{
    public function exists(string $memberId, string $relTable, string $relId, string $relAction): bool
    {
        $pointTable = $this->getPointTable();
        $row = $this->fetchAssociative(
            "SELECT po_id
             FROM {$pointTable}
             WHERE mb_id = :mb_id
               AND po_rel_table = :po_rel_table
               AND po_rel_id = :po_rel_id
               AND po_rel_action = :po_rel_action
             LIMIT 1",
            [
                'mb_id' => trim($memberId),
                'po_rel_table' => trim($relTable),
                'po_rel_id' => trim($relId),
                'po_rel_action' => trim($relAction),
            ]
        );

        return is_array($row) && (int)($row['po_id'] ?? 0) > 0;
    }

    public function getSummary(?string $memberId = null): array
    {
        $pointTable = $this->getPointTable();
        $normalizedMemberId = trim((string)$memberId);
        if ($normalizedMemberId !== '') {
            $row = $this->fetchAssociative(
                "SELECT COALESCE(SUM(po_point), 0) AS total_point, COUNT(*) AS total_rows
                 FROM {$pointTable}
                 WHERE mb_id = :mb_id",
                ['mb_id' => $normalizedMemberId]
            );

            return [
                'mb_id' => $normalizedMemberId,
                'total_point' => (int)($row['total_point'] ?? 0),
                'total_rows' => (int)($row['total_rows'] ?? 0),
            ];
        }

        $row = $this->fetchAssociative(
            "SELECT COALESCE(SUM(po_point), 0) AS total_point, COUNT(*) AS total_rows
             FROM {$pointTable}"
        );

        return [
            'total_point' => (int)($row['total_point'] ?? 0),
            'total_rows' => (int)($row['total_rows'] ?? 0),
        ];
    }

    public function sumMemberPoints(string $memberId): int
    {
        $pointTable = $this->getPointTable();
        $row = $this->fetchAssociative(
            "SELECT COALESCE(SUM(po_point), 0) AS sum_point
             FROM {$pointTable}
             WHERE mb_id = :mb_id",
            ['mb_id' => trim($memberId)]
        );

        return (int)($row['sum_point'] ?? 0);
    }
}
