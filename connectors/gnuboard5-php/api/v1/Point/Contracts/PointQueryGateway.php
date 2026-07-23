<?php

declare(strict_types=1);

namespace Api\Point\Contracts;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\PaginatedResult;
use Api\Core\DTO\PointDTO;

interface PointQueryGateway
{
    /**
     * @return PaginatedResult<PointDTO>
     */
    public function getPointHistory(string $memberId, int $page, int $perPage): PaginatedResult;

    /**
     * @return CursorPaginatedResult<PointDTO>
     */
    public function getPointHistoryByCursor(string $memberId, int $perPage, ?string $cursor): CursorPaginatedResult;

    /**
     * @return array<string, int|string>
     */
    public function getSummary(?string $memberId = null): array;
}
