<?php

declare(strict_types=1);

namespace Api\Admin\Report\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;
use Api\Report\Repository\ReportSchemaRepository;

final class AdminReportQueryRepository extends AdminBaseRepository
{
    private ?AdminReportSchemaRepository $schemaRepository = null;

    private ?ReportSchemaRepository $reportSchemaRepository = null;

    /**
     * @param array<string, mixed> $filters
     * @return array{items: array<int, array<string, mixed>>, total: int}
     */
    public function list(array $filters, int $page, int $perPage): array
    {
        $this->reportSchemaRepository()->ensureTable();
        $table = $this->tables()->get('report');
        $where = [];
        $params = [];

        if (isset($filters['status']) && trim((string)$filters['status']) !== '') {
            $where[] = 'rp_status = :status';
            $params['status'] = trim((string)$filters['status']);
        }
        if (isset($filters['target_type']) && trim((string)$filters['target_type']) !== '') {
            $where[] = 'rp_target_type = :target_type';
            $params['target_type'] = trim((string)$filters['target_type']);
        }

        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $offset = max(0, ($page - 1) * $perPage);
        $limit = max(1, $perPage);

        $items = $this->fetchAllAssociative(
            "SELECT " . $this->schemaRepository()->reportSelectColumns() . "
             FROM {$table}
             {$whereSql}
             ORDER BY rp_id DESC
             LIMIT {$limit} OFFSET {$offset}",
            $params
        );

        $count = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$table}
             {$whereSql}",
            $params
        );

        return [
            'items' => $items,
            'total' => (int)($count['cnt'] ?? 0),
        ];
    }

    /**
     * @return array<string, int>
     */
    public function stats(): array
    {
        $this->reportSchemaRepository()->ensureTable();
        $table = $this->tables()->get('report');
        $rows = $this->fetchAllAssociative(
            "SELECT rp_status, COUNT(*) AS cnt
             FROM {$table}
             GROUP BY rp_status"
        );

        $summary = [
            'pending' => 0,
            'approved' => 0,
            'rejected' => 0,
            'hold' => 0,
            'total' => 0,
        ];

        foreach ($rows as $row) {
            $status = (string)($row['rp_status'] ?? '');
            $count = (int)($row['cnt'] ?? 0);
            if (array_key_exists($status, $summary)) {
                $summary[$status] = $count;
            }
            $summary['total'] += $count;
        }

        return $summary;
    }

    private function schemaRepository(): AdminReportSchemaRepository
    {
        if ($this->schemaRepository instanceof AdminReportSchemaRepository) {
            return $this->schemaRepository;
        }

        return $this->schemaRepository = new AdminReportSchemaRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }

    private function reportSchemaRepository(): ReportSchemaRepository
    {
        if ($this->reportSchemaRepository instanceof ReportSchemaRepository) {
            return $this->reportSchemaRepository;
        }

        return $this->reportSchemaRepository = new ReportSchemaRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }
}
