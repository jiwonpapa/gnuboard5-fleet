<?php

declare(strict_types=1);

namespace Api\Auth\External\Repository;

class ExternalAuthLinkRepository extends ExternalAuthLinkRepositorySupport
{
    private ?ExternalAuthLinkQueryRepository $resolvedQueryRepository = null;
    private ?ExternalAuthLinkMutationRepository $resolvedMutationRepository = null;

    public function __construct(
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null,
        ?ExternalAuthLinkQueryRepository $queryRepository = null,
        ?ExternalAuthLinkMutationRepository $mutationRepository = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedQueryRepository = $queryRepository;
        $this->resolvedMutationRepository = $mutationRepository;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findByProviderUser(string $provider, string $providerUserId): ?array
    {
        return $this->queryRepository()->findByProviderUser($provider, $providerUserId);
    }

    /**
     * @param array<string, mixed> $providerProfile
     * @return array<string, mixed>
     */
    public function saveLink(
        string $provider,
        string $providerUserId,
        string $memberId,
        ?string $providerEmail = null,
        array $providerProfile = []
    ): array {
        return $this->mutationRepository()->saveLink(
            $provider,
            $providerUserId,
            $memberId,
            $providerEmail,
            $providerProfile
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listByMemberId(string $memberId): array
    {
        return $this->queryRepository()->listByMemberId($memberId);
    }

    public function deleteLink(string $provider, string $providerUserId, string $memberId): int
    {
        return $this->mutationRepository()->deleteLink($provider, $providerUserId, $memberId);
    }

    private function queryRepository(): ExternalAuthLinkQueryRepository
    {
        if ($this->resolvedQueryRepository instanceof ExternalAuthLinkQueryRepository) {
            return $this->resolvedQueryRepository;
        }

        $this->resolvedQueryRepository = new ExternalAuthLinkQueryRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedQueryRepository;
    }

    private function mutationRepository(): ExternalAuthLinkMutationRepository
    {
        if ($this->resolvedMutationRepository instanceof ExternalAuthLinkMutationRepository) {
            return $this->resolvedMutationRepository;
        }

        $this->resolvedMutationRepository = new ExternalAuthLinkMutationRepository(
            $this->queryRepository(),
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->resolvedMutationRepository;
    }
}
