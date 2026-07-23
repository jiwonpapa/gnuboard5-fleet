<?php

declare(strict_types=1);

namespace Api\Admin\Visit\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminVisitLogRepository extends AdminBaseRepository
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function search(
        int $page,
        int $perPage,
        ?string $dateFrom,
        ?string $dateTo,
        ?string $ip,
        ?string $referer,
        ?string $agent
    ): array {
        [$where, $params] = $this->buildSearchWhere($dateFrom, $dateTo, $ip, $referer, $agent);
        $table = $this->tables()->get('visit');

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$table}
             {$where}",
            $params
        );
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT
                vi_id,
                vi_ip,
                vi_date,
                vi_time,
                vi_referer,
                vi_agent,
                vi_browser,
                vi_os,
                vi_device
             FROM {$table}
             {$where}
             ORDER BY vi_date DESC, vi_time DESC, vi_id DESC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        );

        return [
            'total' => $total,
            'items' => $items,
        ];
    }

    public function deleteLogs(?string $dateFrom, ?string $dateTo, ?string $ip): int
    {
        [$where, $params] = $this->buildDeleteWhere($dateFrom, $dateTo, $ip);

        return $this->executeStatement(
            "DELETE FROM {$this->tables()->get('visit')} {$where}",
            $params
        );
    }

    public function deleteBefore(string $beforeDate): int
    {
        return $this->executeStatement(
            "DELETE FROM {$this->tables()->get('visit')}
             WHERE vi_date < :before_date",
            ['before_date' => $beforeDate]
        );
    }

    /**
     * @return array{0:string,1:array<string,mixed>}
     */
    private function buildSearchWhere(
        ?string $dateFrom,
        ?string $dateTo,
        ?string $ip,
        ?string $referer,
        ?string $agent
    ): array {
        $where = ' WHERE 1=1 ';
        $params = [];

        $from = trim((string)$dateFrom);
        if ($from !== '') {
            $where .= ' AND vi_date >= :date_from ';
            $params['date_from'] = $from;
        }

        $to = trim((string)$dateTo);
        if ($to !== '') {
            $where .= ' AND vi_date <= :date_to ';
            $params['date_to'] = $to;
        }

        $ipValue = trim((string)$ip);
        if ($ipValue !== '') {
            $where .= ' AND vi_ip LIKE :vi_ip ';
            $params['vi_ip'] = '%' . $ipValue . '%';
        }

        $refererValue = trim((string)$referer);
        if ($refererValue !== '') {
            $where .= ' AND vi_referer LIKE :vi_referer ';
            $params['vi_referer'] = '%' . $refererValue . '%';
        }

        $agentValue = trim((string)$agent);
        if ($agentValue !== '') {
            $where .= ' AND vi_agent LIKE :vi_agent ';
            $params['vi_agent'] = '%' . $agentValue . '%';
        }

        return [$where, $params];
    }

    /**
     * @return array{0:string,1:array<string,mixed>}
     */
    private function buildDeleteWhere(?string $dateFrom, ?string $dateTo, ?string $ip): array
    {
        $where = ' WHERE 1=1 ';
        $params = [];

        $from = trim((string)$dateFrom);
        if ($from !== '') {
            $where .= ' AND vi_date >= :date_from ';
            $params['date_from'] = $from;
        }

        $to = trim((string)$dateTo);
        if ($to !== '') {
            $where .= ' AND vi_date <= :date_to ';
            $params['date_to'] = $to;
        }

        $ipValue = trim((string)$ip);
        if ($ipValue !== '') {
            $where .= ' AND vi_ip = :vi_ip ';
            $params['vi_ip'] = $ipValue;
        }

        return [$where, $params];
    }
}
