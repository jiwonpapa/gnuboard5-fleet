<?php

/**
 * AdminPopularService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Popular\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Popular\Service;

use Api\Admin\Popular\Repository\AdminPopularRepository;
use Api\Admin\Popular\Service\Support\AdminPopularInputNormalizer;

final class AdminPopularService
{
    private ?AdminPopularInputNormalizer $resolvedInput = null;

    public function __construct(private readonly AdminPopularRepository $repository)
    {
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function list(array $query): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(100, max(1, (int)($query['per_page'] ?? 20)));
        $range = $this->input()->dateRange($query);

        $result = $this->repository->list($page, $perPage, $range['date_from'], $range['date_to']);
        $total = $result['total'];

        return [
            'items' => $result['items'],
            'pagination' => $this->buildPagination($page, $perPage, $total),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function reset(array $payload): array
    {
        $range = $this->input()->dateRange($payload, true);

        return [
            'deleted_rows' => $this->repository->reset($range['date_from'], $range['date_to']),
            'date_from' => $range['date_from'],
            'date_to' => $range['date_to'],
        ];
    }

    /**
     * @param array<string, mixed> $query
     * @return array<int,array<string,mixed>>
     */
    public function rank(array $query): array
    {
        $limit = min(100, max(1, (int)($query['limit'] ?? 20)));
        $range = $this->input()->dateRange($query);

        return $this->repository->rank($limit, $range['date_from'], $range['date_to']);
    }

    /**
     * @return array<string, int|bool>
     */
    private function buildPagination(int $page, int $perPage, int $total): array
    {
        $lastPage = max(1, (int)ceil($total / $perPage));

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => $lastPage,
            'has_next' => $page < $lastPage,
            'has_prev' => $page > 1,
        ];
    }

    private function input(): AdminPopularInputNormalizer
    {
        return $this->resolvedInput ??= new AdminPopularInputNormalizer();
    }
}
