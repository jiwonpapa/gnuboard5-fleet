<?php

declare(strict_types=1);

namespace Api\Admin\Member\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\Security\PasswordCompat;

final class AdminMemberRepository extends AdminMemberRepositoryBase
{
    private ?AdminMemberQueryRepository $resolvedQueryRepository = null;

    private ?AdminMemberMutationRepository $resolvedMutationRepository = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        private readonly ?PasswordCompat $passwordCompat = null
    ) {
        parent::__construct($qb, $tables);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function list(int $page, int $perPage, ?string $search, ?string $searchField, string $sortBy, string $sortDirection): array
    {
        return $this->queryRepository()->list($page, $perPage, $search, $searchField, $sortBy, $sortDirection);
    }

    public function find(string $memberId): ?array
    {
        return $this->queryRepository()->find($memberId);
    }

    public function getMemberImageConfig(): array
    {
        return $this->queryRepository()->getMemberImageConfig();
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(string $memberId, array $payload): int
    {
        return $this->mutationRepository()->update($memberId, $payload);
    }

    public function updateLevel(string $memberId, int $level): int
    {
        return $this->mutationRepository()->updateLevel($memberId, $level);
    }

    public function softDelete(string $memberId): int
    {
        return $this->mutationRepository()->softDelete($memberId);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function exportExcel(?string $search, ?string $searchField): array
    {
        return $this->queryRepository()->exportExcel($search, $searchField);
    }

    private function queryRepository(): AdminMemberQueryRepository
    {
        return $this->resolvedQueryRepository ??= new AdminMemberQueryRepository($this->queryBuilder(), $this->tables());
    }

    private function mutationRepository(): AdminMemberMutationRepository
    {
        return $this->resolvedMutationRepository ??= new AdminMemberMutationRepository(
            $this->queryBuilder(),
            $this->tables(),
            $this->passwordCompat
        );
    }
}
