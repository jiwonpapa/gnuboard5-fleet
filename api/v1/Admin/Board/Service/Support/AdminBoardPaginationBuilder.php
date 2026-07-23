<?php

declare(strict_types=1);

namespace Api\Admin\Board\Service\Support;

final class AdminBoardPaginationBuilder
{
    /**
     * @return array<string, int|bool>
     */
    public function build(int $page, int $perPage, int $total): array
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
}
