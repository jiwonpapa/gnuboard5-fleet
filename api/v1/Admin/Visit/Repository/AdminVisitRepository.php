<?php

/**
 * AdminVisitRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Visit\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Visit\Repository;

final class AdminVisitRepository
{
    private readonly AdminVisitStatsRepository $statsRepository;
    private readonly AdminVisitLogRepository $logRepository;

    public function __construct(
        AdminVisitStatsRepository $statsRepository,
        AdminVisitLogRepository $logRepository
    ) {
        $this->statsRepository = $statsRepository;
        $this->logRepository = $logRepository;
    }

    /**
     * @return array{summary:array<string,mixed>,daily:array<int,array<string,mixed>>}
     */
    public function stats(?string $dateFrom, ?string $dateTo): array
    {
        return $this->statsRepository->stats($dateFrom, $dateTo);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function statsByType(string $type, ?string $dateFrom, ?string $dateTo, int $limit = 100): array
    {
        return $this->statsRepository->statsByType($type, $dateFrom, $dateTo, $limit);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function search(
        int $page,
        int $perPage,
        ?string $dateFrom,
        ?string $dateTo,
        ?string $ip,
        ?string $referer,
        ?string $agent
    ): array {
        return $this->logRepository->search($page, $perPage, $dateFrom, $dateTo, $ip, $referer, $agent);
    }

    public function deleteLogs(?string $dateFrom, ?string $dateTo, ?string $ip): int
    {
        return $this->logRepository->deleteLogs($dateFrom, $dateTo, $ip);
    }

    public function deleteBefore(string $beforeDate): int
    {
        return $this->logRepository->deleteBefore($beforeDate);
    }
}
