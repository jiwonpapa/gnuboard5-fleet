<?php

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Service;

trait AdminShopCatalogServiceHelpers
{
    /**
     * @param array<string, mixed> $query
     */
    protected function normalizeListQuery(array $query): array
    {
        $page = isset($query['page']) ? (int)$query['page'] : 1;
        $perPage = isset($query['per_page']) ? (int)$query['per_page'] : 20;

        return [
            'page' => max(1, $page),
            'per_page' => max(1, min(200, $perPage)),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function buildPagination(int $page, int $perPage, int $total): array
    {
        $safeTotal = max(0, $total);
        $safePage = max(1, $page);
        $safePerPage = max(1, $perPage);
        $lastPage = max(1, (int)ceil($safeTotal / $safePerPage));

        return [
            'total' => $safeTotal,
            'page' => $safePage,
            'per_page' => $safePerPage,
            'last_page' => $lastPage,
            'has_next' => $safePage < $lastPage,
            'has_prev' => $safePage > 1,
        ];
    }
}
