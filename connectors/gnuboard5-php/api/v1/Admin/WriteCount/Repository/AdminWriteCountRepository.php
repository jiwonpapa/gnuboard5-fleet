<?php

/**
 * AdminWriteCountRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\WriteCount\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\WriteCount\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminWriteCountRepository extends AdminBaseRepository
{
    /**
     * @return array<int,array<string,mixed>>
     */
    public function stats(string $period, string $dateFrom, string $dateTo, ?string $boTable): array
    {
        $table = $this->tables()->get('board_new');
        $bucketExpr = match ($period) {
            'hour' => "DATE_FORMAT(bn_datetime, '%Y-%m-%d %H:00:00')",
            'week' => "CONCAT(DATE_FORMAT(bn_datetime, '%x'), '-W', DATE_FORMAT(bn_datetime, '%v'))",
            'month' => "DATE_FORMAT(bn_datetime, '%Y-%m')",
            'year' => "DATE_FORMAT(bn_datetime, '%Y')",
            default => "DATE_FORMAT(bn_datetime, '%Y-%m-%d')",
        };

        $where = ' WHERE DATE(bn_datetime) BETWEEN :date_from AND :date_to ';
        $params = [
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
        ];

        $board = trim((string)$boTable);
        if ($board !== '') {
            $where .= ' AND bo_table = :bo_table ';
            $params['bo_table'] = $board;
        }

        return $this->fetchAllAssociative(
            "SELECT
                {$bucketExpr} AS bucket,
                SUM(CASE WHEN wr_id = wr_parent THEN 1 ELSE 0 END) AS write_count,
                SUM(CASE WHEN wr_id = wr_parent THEN 0 ELSE 1 END) AS comment_count
             FROM {$table}
             {$where}
             GROUP BY bucket
             ORDER BY bucket ASC",
            $params
        );
    }
}
