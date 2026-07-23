<?php

declare(strict_types=1);

namespace Api\Admin\Dashboard\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminDashboardRecentPointRepository extends AdminBaseRepository
{
    /**
     * @return list<array<string,mixed>>
     */
    public function recentPoints(int $limit): array
    {
        $pointTable = $this->tables()->get('point');
        $memberTable = $this->tables()->get('member');
        $rows = $this->fetchAllAssociative(
            "SELECT
                p.po_id,
                p.mb_id,
                p.po_datetime,
                p.po_content,
                p.po_point,
                p.po_mb_point,
                p.po_rel_table,
                p.po_rel_id,
                p.po_rel_action,
                m.mb_name,
                m.mb_nick
             FROM {$pointTable} p
             LEFT JOIN {$memberTable} m
               ON m.mb_id = p.mb_id
             ORDER BY p.po_id DESC
             LIMIT {$limit}"
        );

        return array_map(static function (array $row): array {
            return [
                'po_id' => (int)($row['po_id'] ?? 0),
                'mb_id' => (string)($row['mb_id'] ?? ''),
                'mb_name' => (string)($row['mb_name'] ?? ''),
                'mb_nick' => (string)($row['mb_nick'] ?? ''),
                'po_datetime' => (string)($row['po_datetime'] ?? ''),
                'po_content' => (string)($row['po_content'] ?? ''),
                'po_point' => (int)($row['po_point'] ?? 0),
                'po_mb_point' => (int)($row['po_mb_point'] ?? 0),
                'po_rel_table' => (string)($row['po_rel_table'] ?? ''),
                'po_rel_id' => (string)($row['po_rel_id'] ?? ''),
                'po_rel_action' => (string)($row['po_rel_action'] ?? ''),
            ];
        }, $rows);
    }
}
