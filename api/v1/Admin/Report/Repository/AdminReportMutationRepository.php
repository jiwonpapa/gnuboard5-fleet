<?php

declare(strict_types=1);

namespace Api\Admin\Report\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;
use Api\Report\Repository\ReportSchemaRepository;

final class AdminReportMutationRepository extends AdminBaseRepository
{
    private ?AdminReportSchemaRepository $schemaRepository = null;

    private ?ReportSchemaRepository $reportSchemaRepository = null;

    public function updateStatus(int $reportId, string $status, string $memo, string $processedAt): array
    {
        $this->reportSchemaRepository()->ensureTable();
        $table = $this->tables()->get('report');
        $setParts = ['rp_status = :rp_status'];
        $params = [
            'rp_status' => $status,
            'rp_id' => $reportId,
        ];

        if ($this->schemaRepository()->hasReportColumn('rp_admin_memo')) {
            $setParts[] = 'rp_admin_memo = :rp_admin_memo';
            $params['rp_admin_memo'] = $memo;
        }
        if ($this->schemaRepository()->hasReportColumn('rp_processed_at')) {
            $setParts[] = 'rp_processed_at = :rp_processed_at';
            $params['rp_processed_at'] = $processedAt;
        }

        $this->executeStatement(
            "UPDATE {$table}
             SET " . implode(",\n                 ", $setParts) . "
             WHERE rp_id = :rp_id",
            $params
        );

        $row = $this->fetchAssociative(
            "SELECT " . $this->schemaRepository()->reportSelectColumns() . "
             FROM {$table}
             WHERE rp_id = :rp_id
             LIMIT 1",
            ['rp_id' => $reportId]
        );

        return is_array($row) ? $row : [];
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
