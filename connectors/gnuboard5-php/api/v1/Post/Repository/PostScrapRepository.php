<?php

/**
 * PostScrapRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Post\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\DTO\CursorPaginatedResult;

final class PostScrapRepository
{
    private readonly PostScrapQueryRepository $queryRepository;
    private readonly PostScrapMutationRepository $mutationRepository;

    public function __construct(
        PostScrapQueryRepository $queryRepository,
        PostScrapMutationRepository $mutationRepository
    ) {
        $this->queryRepository = $queryRepository;
        $this->mutationRepository = $mutationRepository;
    }

    public function addScrap(string $memberId, string $boTable, int $wrId): int
    {
        return $this->mutationRepository->addScrap($memberId, $boTable, $wrId);
    }

    public function removeScrap(string $memberId, string $boTable, int $wrId): void
    {
        $this->mutationRepository->removeScrap($memberId, $boTable, $wrId);
    }

    public function isScraped(string $memberId, string $boTable, int $wrId): bool
    {
        return $this->mutationRepository->isScraped($memberId, $boTable, $wrId);
    }

    /**
     * @return array{items:array<int,array<string,mixed>>,total:int}
     */
    public function getScrapList(string $memberId, int $page, int $perPage): array
    {
        return $this->queryRepository->getScrapList($memberId, $page, $perPage);
    }

    /**
     * @return CursorPaginatedResult<\Api\Core\DTO\PostScrapDTO>
     */
    public function getScrapListByCursor(string $memberId, int $perPage, ?string $cursor): CursorPaginatedResult
    {
        return $this->queryRepository->getScrapListByCursor($memberId, $perPage, $cursor);
    }

    public function deleteScrapsByPost(string $boTable, int $wrId): void
    {
        $this->mutationRepository->deleteScrapsByPost($boTable, $wrId);
    }

    public function updateScrapCount(string $memberId): void
    {
        $this->mutationRepository->updateScrapCount($memberId);
    }
}
