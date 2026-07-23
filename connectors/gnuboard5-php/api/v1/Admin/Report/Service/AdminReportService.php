<?php

/**
 * AdminReportService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Report\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Report\Service;

use Api\Admin\Report\Repository\AdminReportRepository;
use Api\Admin\Report\Service\Support\AdminReportInputNormalizer;
use Api\Admin\Report\Service\Support\AdminReportPresenter;
use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;

final class AdminReportService
{
    private readonly AdminReportInputNormalizer $inputNormalizer;

    private readonly AdminReportPresenter $presenter;

    public function __construct(
        private readonly AdminReportRepository $repository,
        ?AdminReportInputNormalizer $inputNormalizer = null,
        ?AdminReportPresenter $presenter = null,
    ) {
        $this->inputNormalizer = $inputNormalizer ?? new AdminReportInputNormalizer();
        $this->presenter = $presenter ?? new AdminReportPresenter();
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items: array<int, array<string, mixed>>, pagination: array<string, mixed>}
     */
    public function list(array $query): array
    {
        $input = $this->inputNormalizer->listQuery($query);
        $page = $input['page'];
        $perPage = $input['per_page'];
        $filters = [];

        if ($input['status'] !== null) {
            $filters['status'] = $input['status'];
        }
        if ($input['target_type'] !== null) {
            $filters['target_type'] = $input['target_type'];
        }

        $result = $this->repository->list($filters, $page, $perPage);
        $total = (int)($result['total'] ?? 0);
        $lastPage = (int)ceil($total / $perPage);

        $items = [];
        foreach ($result['items'] as $row) {
            $items[] = $this->presenter->item($row);
        }

        return [
            'items' => $items,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => $lastPage,
                'has_next' => $page < $lastPage,
                'has_prev' => $page > 1,
            ],
        ];
    }

    public function update(int $reportId, array $payload): array
    {
        if ($reportId <= 0) {
            throw ApiException::badRequest('report_id 형식이 올바르지 않습니다.');
        }

        $input = $this->inputNormalizer->updatePayload($payload);

        $updated = $this->repository->updateStatus(
            $reportId,
            $input['status'],
            $input['admin_memo'],
            G5DateTime::now()
        );
        if ($updated === []) {
            throw ApiException::notFound('신고 내역을 찾을 수 없습니다.');
        }

        return $this->presenter->item($updated);
    }

    /**
     * @return array<string, int>
     */
    public function stats(): array
    {
        return $this->repository->stats();
    }
}
