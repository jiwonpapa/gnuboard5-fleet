<?php

declare(strict_types=1);

namespace Api\Admin\Visit\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminVisitStatsRepository extends AdminBaseRepository
{
    /**
     * @return array{summary:array<string,mixed>,daily:array<int,array<string,mixed>>}
     */
    public function stats(?string $dateFrom, ?string $dateTo): array
    {
        [$sumWhere, $sumParams] = $this->buildDateWhere('vs_date', $dateFrom, $dateTo);
        [$visitWhere, $visitParams] = $this->buildDateWhere('vi_date', $dateFrom, $dateTo);
        $visitSumTable = $this->tables()->get('visit_sum');
        $visitTable = $this->tables()->get('visit');

        $summary = $this->fetchAssociative(
            "SELECT
                COALESCE(SUM(vs_count), 0) AS total_visits,
                COUNT(*) AS active_days,
                MIN(vs_date) AS first_date,
                MAX(vs_date) AS last_date
             FROM {$visitSumTable}
             {$sumWhere}",
            $sumParams
        );

        $daily = $this->fetchAllAssociative(
            "SELECT vs_date, vs_count
             FROM {$visitSumTable}
             {$sumWhere}
             ORDER BY vs_date DESC",
            $sumParams
        );

        $uniqueRow = $this->fetchAssociative(
            "SELECT
                COUNT(*) AS total_rows,
                COUNT(DISTINCT vi_ip) AS unique_ips
             FROM {$visitTable}
             {$visitWhere}",
            $visitParams
        );

        return [
            'summary' => [
                'total_visits' => (int)($summary['total_visits'] ?? 0),
                'active_days' => (int)($summary['active_days'] ?? 0),
                'first_date' => (string)($summary['first_date'] ?? ''),
                'last_date' => (string)($summary['last_date'] ?? ''),
                'visit_rows' => (int)($uniqueRow['total_rows'] ?? 0),
                'unique_ips' => (int)($uniqueRow['unique_ips'] ?? 0),
            ],
            'daily' => $daily,
        ];
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function statsByType(string $type, ?string $dateFrom, ?string $dateTo, int $limit = 100): array
    {
        $safeLimit = max(1, min(1000, $limit));
        $visitTable = $this->tables()->get('visit');
        $visitSumTable = $this->tables()->get('visit_sum');
        [$dateWhere, $params] = $this->buildDateWhere('vi_date', $dateFrom, $dateTo);

        if ($type === 'date') {
            [$sumWhere, $sumParams] = $this->buildDateWhere('vs_date', $dateFrom, $dateTo);

            return $this->fetchAllAssociative(
                "SELECT vs_date AS stat_key, vs_count AS visit_count
                 FROM {$visitSumTable}
                 {$sumWhere}
                 ORDER BY vs_date DESC
                 LIMIT {$safeLimit}",
                $sumParams
            );
        }

        $sql = match ($type) {
            'hour' => "SELECT CONCAT(vi_date, ' ', LPAD(vi_hour, 2, '0'), ':00') AS stat_key, COUNT(*) AS visit_count
                       FROM {$visitTable}
                       {$dateWhere}
                       GROUP BY vi_date, vi_hour
                       ORDER BY vi_date DESC, vi_hour DESC
                       LIMIT {$safeLimit}",
            'week' => "SELECT DATE_FORMAT(vi_date, '%x-W%v') AS stat_key, COUNT(*) AS visit_count
                       FROM {$visitTable}
                       {$dateWhere}
                       GROUP BY DATE_FORMAT(vi_date, '%x-W%v')
                       ORDER BY stat_key DESC
                       LIMIT {$safeLimit}",
            'month' => "SELECT DATE_FORMAT(vi_date, '%Y-%m') AS stat_key, COUNT(*) AS visit_count
                        FROM {$visitTable}
                        {$dateWhere}
                        GROUP BY DATE_FORMAT(vi_date, '%Y-%m')
                        ORDER BY stat_key DESC
                        LIMIT {$safeLimit}",
            'year' => "SELECT DATE_FORMAT(vi_date, '%Y') AS stat_key, COUNT(*) AS visit_count
                       FROM {$visitTable}
                       {$dateWhere}
                       GROUP BY DATE_FORMAT(vi_date, '%Y')
                       ORDER BY stat_key DESC
                       LIMIT {$safeLimit}",
            'browser' => "SELECT COALESCE(NULLIF(TRIM(vi_browser), ''), '(unknown)') AS stat_key, COUNT(*) AS visit_count
                          FROM {$visitTable}
                          {$dateWhere}
                          GROUP BY COALESCE(NULLIF(TRIM(vi_browser), ''), '(unknown)')
                          ORDER BY visit_count DESC, stat_key ASC
                          LIMIT {$safeLimit}",
            'os' => "SELECT COALESCE(NULLIF(TRIM(vi_os), ''), '(unknown)') AS stat_key, COUNT(*) AS visit_count
                     FROM {$visitTable}
                     {$dateWhere}
                     GROUP BY COALESCE(NULLIF(TRIM(vi_os), ''), '(unknown)')
                     ORDER BY visit_count DESC, stat_key ASC
                     LIMIT {$safeLimit}",
            'device' => "SELECT COALESCE(NULLIF(TRIM(vi_device), ''), '(unknown)') AS stat_key, COUNT(*) AS visit_count
                         FROM {$visitTable}
                         {$dateWhere}
                         GROUP BY COALESCE(NULLIF(TRIM(vi_device), ''), '(unknown)')
                         ORDER BY visit_count DESC, stat_key ASC
                         LIMIT {$safeLimit}",
            'domain' => "SELECT COALESCE(NULLIF(TRIM(vi_referer), ''), '(direct)') AS stat_key, COUNT(*) AS visit_count
                         FROM {$visitTable}
                         {$dateWhere}
                         GROUP BY COALESCE(NULLIF(TRIM(vi_referer), ''), '(direct)')
                         ORDER BY visit_count DESC, stat_key ASC
                         LIMIT {$safeLimit}",
            'search' => "SELECT COALESCE(NULLIF(TRIM(vi_referer), ''), '(none)') AS stat_key, COUNT(*) AS visit_count
                         FROM {$visitTable}
                         {$dateWhere}
                         AND (
                             vi_referer LIKE '%google.%'
                             OR vi_referer LIKE '%naver.%'
                             OR vi_referer LIKE '%daum.%'
                             OR vi_referer LIKE '%bing.%'
                             OR vi_referer LIKE '%yahoo.%'
                         )
                         GROUP BY COALESCE(NULLIF(TRIM(vi_referer), ''), '(none)')
                         ORDER BY visit_count DESC, stat_key ASC
                         LIMIT {$safeLimit}",
            default => '',
        };

        return $sql === '' ? [] : $this->fetchAllAssociative($sql, $params);
    }

    /**
     * @return array{0:string,1:array<string,mixed>}
     */
    private function buildDateWhere(string $column, ?string $dateFrom, ?string $dateTo): array
    {
        $where = ' WHERE 1=1 ';
        $params = [];

        $from = trim((string)$dateFrom);
        if ($from !== '') {
            $where .= " AND {$column} >= :date_from ";
            $params['date_from'] = $from;
        }

        $to = trim((string)$dateTo);
        if ($to !== '') {
            $where .= " AND {$column} <= :date_to ";
            $params['date_to'] = $to;
        }

        return [$where, $params];
    }
}
