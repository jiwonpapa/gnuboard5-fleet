<?php

/**
 * PointQueryRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Point\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Point\Repository;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\PaginatedResult;

final class PointQueryRepository extends PointRepositorySupport
{
    private ?PointHistoryQueryRepository $historyRepository = null;

    private ?PointSummaryQueryRepository $summaryRepository = null;

    /**
     * @return PaginatedResult<\Api\Core\DTO\PointDTO>
     */
    public function getPointHistory(string $memberId, int $page, int $perPage): PaginatedResult
    {
        return $this->historyRepository()->getPointHistory($memberId, $page, $perPage);
    }

    /**
     * @return CursorPaginatedResult<\Api\Core\DTO\PointDTO>
     */
    public function getPointHistoryByCursor(string $memberId, int $perPage, ?string $cursor): CursorPaginatedResult
    {
        return $this->historyRepository()->getPointHistoryByCursor($memberId, $perPage, $cursor);
    }

    public function exists(string $memberId, string $relTable, string $relId, string $relAction): bool
    {
        return $this->summaryRepository()->exists($memberId, $relTable, $relId, $relAction);
    }

    public function getSummary(?string $memberId = null): array
    {
        return $this->summaryRepository()->getSummary($memberId);
    }

    public function sumMemberPoints(string $memberId): int
    {
        return $this->summaryRepository()->sumMemberPoints($memberId);
    }

    private function historyRepository(): PointHistoryQueryRepository
    {
        if ($this->historyRepository instanceof PointHistoryQueryRepository) {
            return $this->historyRepository;
        }

        return $this->historyRepository = new PointHistoryQueryRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }

    private function summaryRepository(): PointSummaryQueryRepository
    {
        if ($this->summaryRepository instanceof PointSummaryQueryRepository) {
            return $this->summaryRepository;
        }

        return $this->summaryRepository = new PointSummaryQueryRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }
}
