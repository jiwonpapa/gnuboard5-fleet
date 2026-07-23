<?php

/**
 * AdminGroupRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Group\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Group\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class AdminGroupRepository extends AdminBaseRepository
{
    /**
     * Admin schema extractor가 facade 상수에 의존하므로 여기에도 유지한다.
     *
     * @var list<string>
     */
    private const UPDATABLE_FIELDS = [
        'gr_subject',
        'gr_admin',
        'gr_device',
        'gr_use_access',
    ];

    private ?AdminGroupQueryRepository $resolvedQueryRepository = null;
    private ?AdminGroupMutationRepository $resolvedMutationRepository = null;
    private ?AdminGroupMemberRepository $resolvedMemberRepository = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?AdminGroupQueryRepository $queryRepository = null,
        ?AdminGroupMutationRepository $mutationRepository = null,
        ?AdminGroupMemberRepository $memberRepository = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedQueryRepository = $queryRepository;
        $this->resolvedMutationRepository = $mutationRepository;
        $this->resolvedMemberRepository = $memberRepository;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        return $this->queryRepository()->list();
    }

    public function find(string $groupId): ?array
    {
        return $this->queryRepository()->find($groupId);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(array $payload): void
    {
        $this->mutationRepository()->create($payload);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(string $groupId, array $payload): int
    {
        return $this->mutationRepository()->update($groupId, $payload);
    }

    public function delete(string $groupId): int
    {
        return $this->mutationRepository()->delete($groupId);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listMembers(string $groupId, int $page, int $perPage, ?string $search): array
    {
        return $this->memberRepository()->listMembers($groupId, $page, $perPage, $search);
    }

    public function addMember(string $groupId, string $memberId, string $datetime): void
    {
        $this->memberRepository()->addMember($groupId, $memberId, $datetime);
    }

    public function removeMember(string $groupId, string $memberId): int
    {
        return $this->memberRepository()->removeMember($groupId, $memberId);
    }

    public function existsGroupMember(string $groupId, string $memberId): bool
    {
        return $this->memberRepository()->existsGroupMember($groupId, $memberId);
    }

    public function existsMember(string $memberId): bool
    {
        return $this->memberRepository()->existsMember($memberId);
    }

    private function queryRepository(): AdminGroupQueryRepository
    {
        if ($this->resolvedQueryRepository instanceof AdminGroupQueryRepository) {
            return $this->resolvedQueryRepository;
        }

        $this->resolvedQueryRepository = new AdminGroupQueryRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedQueryRepository;
    }

    private function mutationRepository(): AdminGroupMutationRepository
    {
        if ($this->resolvedMutationRepository instanceof AdminGroupMutationRepository) {
            return $this->resolvedMutationRepository;
        }

        $this->resolvedMutationRepository = new AdminGroupMutationRepository(
            $this->queryBuilder(),
            $this->tables(),
            self::UPDATABLE_FIELDS
        );

        return $this->resolvedMutationRepository;
    }

    private function memberRepository(): AdminGroupMemberRepository
    {
        if ($this->resolvedMemberRepository instanceof AdminGroupMemberRepository) {
            return $this->resolvedMemberRepository;
        }

        $this->resolvedMemberRepository = new AdminGroupMemberRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedMemberRepository;
    }
}
