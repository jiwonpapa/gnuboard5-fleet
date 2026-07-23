<?php

/**
 * AdminPopularRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Popular\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Popular\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminPopularRepository extends AdminBaseRepository
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function list(int $page, int $perPage, ?string $dateFrom, ?string $dateTo): array
    {
        $table = $this->tables()->get('popular');
        $where = ' WHERE 1=1 ';
        $params = [];

        $from = trim((string)$dateFrom);
        if ($from !== '') {
            $where .= ' AND pp_date >= :date_from ';
            $params['date_from'] = $from;
        }

        $to = trim((string)$dateTo);
        if ($to !== '') {
            $where .= ' AND pp_date <= :date_to ';
            $params['date_to'] = $to;
        }

        $countRow = $this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$table} {$where}", $params);
        $rawTotal = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $rows = $this->fetchAllAssociative(
            "SELECT
                pp_word,
                pp_date,
                COUNT(*) AS pp_cnt
             FROM {$table}
             {$where}
             GROUP BY pp_date, pp_word
             ORDER BY pp_date DESC, pp_cnt DESC, pp_word ASC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        );

        $items = [];
        foreach ($rows as $index => $row) {
            $items[] = [
                'pp_word' => (string)($row['pp_word'] ?? ''),
                'pp_date' => (string)($row['pp_date'] ?? ''),
                'pp_cnt' => (int)($row['pp_cnt'] ?? 0),
                'pp_rank' => $offset + $index + 1,
            ];
        }

        $groupCountRows = $this->fetchAllAssociative(
            "SELECT COUNT(*) AS cnt
             FROM (
                SELECT pp_word, pp_date
                FROM {$table}
                {$where}
                GROUP BY pp_date, pp_word
             ) t",
            $params
        );
        $total = (int)($groupCountRows[0]['cnt'] ?? 0);
        if ($total <= 0) {
            $total = $rawTotal > 0 ? $rawTotal : 0;
        }

        return [
            'total' => $total,
            'items' => $items,
        ];
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function rank(int $limit, ?string $dateFrom, ?string $dateTo): array
    {
        $table = $this->tables()->get('popular');
        $where = ' WHERE 1=1 ';
        $params = [];

        $from = trim((string)$dateFrom);
        if ($from !== '') {
            $where .= ' AND pp_date >= :date_from ';
            $params['date_from'] = $from;
        }

        $to = trim((string)$dateTo);
        if ($to !== '') {
            $where .= ' AND pp_date <= :date_to ';
            $params['date_to'] = $to;
        }

        $rows = $this->fetchAllAssociative(
            "SELECT
                pp_word,
                COUNT(*) AS hit_count,
                MIN(pp_date) AS first_date,
                MAX(pp_date) AS last_date
             FROM {$table}
             {$where}
             GROUP BY pp_word
             ORDER BY hit_count DESC, pp_word ASC
             LIMIT {$limit}",
            $params
        );

        $ranked = [];
        foreach ($rows as $index => $row) {
            $ranked[] = [
                'rank' => $index + 1,
                'pp_word' => (string)($row['pp_word'] ?? ''),
                'hit_count' => (int)($row['hit_count'] ?? 0),
                'first_date' => (string)($row['first_date'] ?? ''),
                'last_date' => (string)($row['last_date'] ?? ''),
            ];
        }

        return $ranked;
    }

    public function reset(?string $dateFrom, ?string $dateTo): int
    {
        $table = $this->tables()->get('popular');
        $params = [];

        $from = trim((string)$dateFrom);
        $to = trim((string)$dateTo);

        if ($from !== '' && $to !== '') {
            return $this->executeStatement(
                "DELETE FROM {$table} WHERE pp_date BETWEEN :date_from AND :date_to",
                [
                    'date_from' => $from,
                    'date_to' => $to,
                ]
            );
        }

        if ($from !== '') {
            return $this->executeStatement(
                "DELETE FROM {$table} WHERE pp_date >= :date_from",
                ['date_from' => $from]
            );
        }

        if ($to !== '') {
            return $this->executeStatement(
                "DELETE FROM {$table} WHERE pp_date <= :date_to",
                ['date_to' => $to]
            );
        }

        return $this->executeStatement("DELETE FROM {$table}");
    }
}
