<?php

/**
 * AdminReportRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Report\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Report\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminReportRepository extends AdminBaseRepository
{
    private ?AdminReportQueryRepository $queryRepository = null;

    private ?AdminReportMutationRepository $mutationRepository = null;

    /**
     * @param array<string, mixed> $filters
     * @return array{items: array<int, array<string, mixed>>, total: int}
     */
    public function list(array $filters, int $page, int $perPage): array
    {
        return $this->queryRepository()->list($filters, $page, $perPage);
    }

    public function updateStatus(int $reportId, string $status, string $memo, string $processedAt): array
    {
        return $this->mutationRepository()->updateStatus($reportId, $status, $memo, $processedAt);
    }

    /**
     * @return array<string, int>
     */
    public function stats(): array
    {
        return $this->queryRepository()->stats();
    }

    private function queryRepository(): AdminReportQueryRepository
    {
        if ($this->queryRepository instanceof AdminReportQueryRepository) {
            return $this->queryRepository;
        }

        return $this->queryRepository = new AdminReportQueryRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }

    private function mutationRepository(): AdminReportMutationRepository
    {
        if ($this->mutationRepository instanceof AdminReportMutationRepository) {
            return $this->mutationRepository;
        }

        return $this->mutationRepository = new AdminReportMutationRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }
}
