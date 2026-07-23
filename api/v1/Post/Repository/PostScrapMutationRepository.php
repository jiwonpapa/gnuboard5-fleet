<?php

declare(strict_types=1);

namespace Api\Post\Repository;

final class PostScrapMutationRepository extends PostRepositorySupport
{
    private ?PostScrapWriteStore $resolvedWriteStore = null;
    private ?PostScrapCountStore $resolvedCountStore = null;

    public function __construct(
        \Api\Integration\Contracts\BoardGateway $boardRepository,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null,
        ?PostScrapWriteStore $writeStore = null,
        ?PostScrapCountStore $countStore = null
    ) {
        parent::__construct($boardRepository, $qb, $tables);
        $this->resolvedWriteStore = $writeStore;
        $this->resolvedCountStore = $countStore;
    }

    public function addScrap(string $memberId, string $boTable, int $wrId): int
    {
        return $this->writeStore()->addScrap($memberId, $boTable, $wrId);
    }

    public function removeScrap(string $memberId, string $boTable, int $wrId): void
    {
        $this->writeStore()->removeScrap($memberId, $boTable, $wrId);
    }

    public function isScraped(string $memberId, string $boTable, int $wrId): bool
    {
        return $this->writeStore()->isScraped($memberId, $boTable, $wrId);
    }

    public function deleteScrapsByPost(string $boTable, int $wrId): void
    {
        $this->countStore()->deleteScrapsByPost($boTable, $wrId);
    }

    public function updateScrapCount(string $memberId): void
    {
        $this->countStore()->updateScrapCount($memberId);
    }

    private function writeStore(): PostScrapWriteStore
    {
        if ($this->resolvedWriteStore instanceof PostScrapWriteStore) {
            return $this->resolvedWriteStore;
        }

        $this->resolvedWriteStore = new PostScrapWriteStore(
            $this->boardRepository,
            $this->countStore(),
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->resolvedWriteStore;
    }

    private function countStore(): PostScrapCountStore
    {
        if ($this->resolvedCountStore instanceof PostScrapCountStore) {
            return $this->resolvedCountStore;
        }

        $this->resolvedCountStore = new PostScrapCountStore(
            $this->boardRepository,
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->resolvedCountStore;
    }
}
