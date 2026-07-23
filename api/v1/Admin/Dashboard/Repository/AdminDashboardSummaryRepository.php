<?php

declare(strict_types=1);

namespace Api\Admin\Dashboard\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminDashboardSummaryRepository extends AdminBaseRepository
{
    /**
     * @return array<string,int>
     */
    public function memberSummary(): array
    {
        $table = $this->tables()->get('member');
        $row = $this->fetchAssociative(
            "SELECT
                COUNT(*) AS total_members,
                SUM(CASE WHEN mb_intercept_date <> '' THEN 1 ELSE 0 END) AS blocked_members,
                SUM(CASE WHEN mb_leave_date <> '' THEN 1 ELSE 0 END) AS leave_members
             FROM {$table}"
        );

        return [
            'total_members' => (int)($row['total_members'] ?? 0),
            'blocked_members' => (int)($row['blocked_members'] ?? 0),
            'leave_members' => (int)($row['leave_members'] ?? 0),
        ];
    }

    /**
     * @return array{total_rows:int}
     */
    public function postSummary(): array
    {
        $table = $this->tables()->get('board_new');
        $row = $this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$table}");

        return [
            'total_rows' => (int)($row['cnt'] ?? 0),
        ];
    }

    /**
     * @return array{total_rows:int}
     */
    public function pointSummary(): array
    {
        $table = $this->tables()->get('point');
        $row = $this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$table}");

        return [
            'total_rows' => (int)($row['cnt'] ?? 0),
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function visitSummary(): array
    {
        $visitSumTable = $this->tables()->get('visit_sum');
        $visitTable = $this->tables()->get('visit');
        $summary = $this->fetchAssociative(
            "SELECT
                COALESCE(SUM(vs_count), 0) AS total_visits,
                COUNT(*) AS active_days,
                MIN(vs_date) AS first_date,
                MAX(vs_date) AS last_date
             FROM {$visitSumTable}"
        );
        $uniqueRow = $this->fetchAssociative(
            "SELECT
                COUNT(*) AS total_rows,
                COUNT(DISTINCT vi_ip) AS unique_ips
             FROM {$visitTable}"
        );

        return [
            'total_visits' => (int)($summary['total_visits'] ?? 0),
            'active_days' => (int)($summary['active_days'] ?? 0),
            'first_date' => (string)($summary['first_date'] ?? ''),
            'last_date' => (string)($summary['last_date'] ?? ''),
            'visit_rows' => (int)($uniqueRow['total_rows'] ?? 0),
            'unique_ips' => (int)($uniqueRow['unique_ips'] ?? 0),
        ];
    }
}
