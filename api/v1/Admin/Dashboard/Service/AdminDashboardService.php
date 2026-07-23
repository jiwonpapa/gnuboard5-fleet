<?php

declare(strict_types=1);

namespace Api\Admin\Dashboard\Service;

use Api\Admin\Dashboard\Repository\AdminDashboardRepository;
use Api\Support\Exception\ApiException;

final class AdminDashboardService
{
    public function __construct(private readonly AdminDashboardRepository $repository)
    {
    }

    /**
     * @param array<string,mixed> $query
     * @return array<string,mixed>
     */
    public function overview(array $query): array
    {
        $limit = (int)($query['limit'] ?? 5);
        if ($limit < 1 || $limit > 20) {
            throw ApiException::badRequest('limit은 1 이상 20 이하의 정수여야 합니다.');
        }

        return $this->repository->overview($limit);
    }
}
