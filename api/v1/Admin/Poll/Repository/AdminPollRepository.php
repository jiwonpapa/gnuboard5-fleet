<?php

/**
 * AdminPollRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Poll\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Poll\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

class AdminPollRepository extends AdminBaseRepository
{
    /**
     * Admin schema extractor가 facade 상수에 의존하므로 여기에도 유지한다.
     *
     * @var list<string>
     */
    private const UPDATABLE_FIELDS = [
        'po_subject',
        'po_poll1',
        'po_poll2',
        'po_poll3',
        'po_poll4',
        'po_poll5',
        'po_poll6',
        'po_poll7',
        'po_poll8',
        'po_poll9',
        'po_etc',
        'po_level',
        'po_point',
        'po_use',
    ];

    private ?AdminPollQueryRepository $resolvedQueryRepository = null;
    private ?AdminPollMutationRepository $resolvedMutationRepository = null;
    private ?AdminPollVoteRepository $resolvedVoteRepository = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?AdminPollQueryRepository $queryRepository = null,
        ?AdminPollMutationRepository $mutationRepository = null,
        ?AdminPollVoteRepository $voteRepository = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedQueryRepository = $queryRepository;
        $this->resolvedMutationRepository = $mutationRepository;
        $this->resolvedVoteRepository = $voteRepository;
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function list(int $page, int $perPage): array
    {
        return $this->queryRepository()->list($page, $perPage);
    }

    public function find(int $pollId): ?array
    {
        return $this->queryRepository()->find($pollId);
    }

    public function findActive(): ?array
    {
        return $this->queryRepository()->findActive();
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function create(array $payload): int
    {
        return $this->mutationRepository()->create($payload);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function update(int $pollId, array $payload): int
    {
        return $this->mutationRepository()->update($pollId, $payload);
    }

    public function delete(int $pollId): int
    {
        return $this->mutationRepository()->delete($pollId);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function listEtc(int $pollId, int $limit = 100): array
    {
        return $this->queryRepository()->listEtc($pollId, $limit);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findMember(string $memberId): ?array
    {
        return $this->queryRepository()->findMember($memberId);
    }

    public function recordVote(int $pollId, int $pollNo, string $poIps, string $memberIds): int
    {
        return $this->voteRepository()->recordVote($pollId, $pollNo, $poIps, $memberIds);
    }

    public function addEtcIdea(int $pollId, string $memberId, string $name, string $idea): int
    {
        return $this->voteRepository()->addEtcIdea($pollId, $memberId, $name, $idea);
    }

    private function queryRepository(): AdminPollQueryRepository
    {
        if ($this->resolvedQueryRepository instanceof AdminPollQueryRepository) {
            return $this->resolvedQueryRepository;
        }

        $this->resolvedQueryRepository = new AdminPollQueryRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedQueryRepository;
    }

    private function mutationRepository(): AdminPollMutationRepository
    {
        if ($this->resolvedMutationRepository instanceof AdminPollMutationRepository) {
            return $this->resolvedMutationRepository;
        }

        $this->resolvedMutationRepository = new AdminPollMutationRepository(
            $this->queryBuilder(),
            $this->tables(),
            self::UPDATABLE_FIELDS
        );

        return $this->resolvedMutationRepository;
    }

    private function voteRepository(): AdminPollVoteRepository
    {
        if ($this->resolvedVoteRepository instanceof AdminPollVoteRepository) {
            return $this->resolvedVoteRepository;
        }

        $this->resolvedVoteRepository = new AdminPollVoteRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedVoteRepository;
    }
}
