<?php

/**
 * PointRepository API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Point\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Point\Repository;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\PaginatedResult;
use Api\Core\DTO\PointDTO;
use Api\Integration\Contracts\PointGateway as LegacyPointGateway;
use Api\Point\Contracts\PointGateway;
use Api\Point\Contracts\PointMaintenanceGateway;
use Api\Point\Contracts\PointQueryGateway;
use Api\Point\Contracts\PointRewardGateway;

final class PointRepository implements PointGateway, PointQueryGateway, PointRewardGateway, PointMaintenanceGateway, LegacyPointGateway
{
    private readonly PointQueryRepository $queryRepository;
    private readonly PointMutationRepository $mutationRepository;
    private readonly PointMaintenanceRepository $maintenanceRepository;

    public function __construct(
        PointQueryRepository $queryRepository,
        PointMutationRepository $mutationRepository,
        PointMaintenanceRepository $maintenanceRepository
    ) {
        $this->queryRepository = $queryRepository;
        $this->mutationRepository = $mutationRepository;
        $this->maintenanceRepository = $maintenanceRepository;
    }

    /**
     * @return PaginatedResult<PointDTO>
     */
    public function getPointHistory(string $memberId, int $page, int $perPage): PaginatedResult
    {
        return $this->queryRepository->getPointHistory($memberId, $page, $perPage);
    }

    public function getPointHistoryByCursor(string $memberId, int $perPage, ?string $cursor): CursorPaginatedResult
    {
        return $this->queryRepository->getPointHistoryByCursor($memberId, $perPage, $cursor);
    }

    public function grant(
        string $memberId,
        int $point,
        string $content,
        string $relTable,
        string $relId,
        string $relAction,
        ?int $expireDays = null
    ): void {
        $this->mutationRepository->grant($memberId, $point, $content, $relTable, $relId, $relAction, $expireDays);
    }

    public function revoke(
        string $memberId,
        string $relTable,
        string $relId,
        string $originalAction,
        string $revokeAction,
        string $revokeContent
    ): bool {
        return $this->mutationRepository->revoke(
            $memberId,
            $relTable,
            $relId,
            $originalAction,
            $revokeAction,
            $revokeContent
        );
    }

    public function exists(string $memberId, string $relTable, string $relId, string $relAction): bool
    {
        return $this->queryRepository->exists($memberId, $relTable, $relId, $relAction);
    }

    public function syncTotal(string $memberId): void
    {
        $this->maintenanceRepository->syncTotal($memberId);
    }

    public function deleteById(int $poId, string $memberId): void
    {
        $this->mutationRepository->deleteById($poId, $memberId);
    }

    public function getSummary(?string $memberId = null): array
    {
        return $this->queryRepository->getSummary($memberId);
    }

    public function expirePoints(?string $today = null): array
    {
        return $this->maintenanceRepository->expirePoints($today);
    }
}
