<?php

/**
 * MemberQueryRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Member\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Repository;

use Api\Core\Config\EnvConfig;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\Security\PasswordCompat;

final class MemberQueryRepository extends MemberRepositorySupport
{
    private ?MemberLookupRepository $resolvedLookupRepository = null;
    private ?MemberConstraintRepository $resolvedConstraintRepository = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?PasswordCompat $passwordCompat = null,
        ?EnvConfig $envConfig = null,
        ?MemberLookupRepository $lookupRepository = null,
        ?MemberConstraintRepository $constraintRepository = null
    ) {
        parent::__construct($qb, $tables, $passwordCompat, $envConfig);
        $this->resolvedLookupRepository = $lookupRepository;
        $this->resolvedConstraintRepository = $constraintRepository;
    }

    public function findById(string $memberId): ?array
    {
        return $this->lookupRepository()->findById($memberId);
    }

    public function getMemberImageConfig(): array
    {
        return $this->lookupRepository()->getMemberImageConfig();
    }

    public function existsNick(string $nickname, string $memberId): bool
    {
        return $this->constraintRepository()->existsNick($nickname, $memberId);
    }

    public function existsEmail(string $email, string $memberId): bool
    {
        return $this->constraintRepository()->existsEmail($email, $memberId);
    }

    public function existsHpForOther(string $phone, string $memberId): bool
    {
        return $this->constraintRepository()->existsHpForOther($phone, $memberId);
    }

    public function getNicknameCooldownDays(): int
    {
        return $this->constraintRepository()->getNicknameCooldownDays();
    }

    public function isReservedNick(string $nick): bool
    {
        return $this->constraintRepository()->isReservedNick($nick);
    }

    public function isProhibitedEmailDomain(string $email): bool
    {
        return $this->constraintRepository()->isProhibitedEmailDomain($email);
    }

    private function lookupRepository(): MemberLookupRepository
    {
        if ($this->resolvedLookupRepository instanceof MemberLookupRepository) {
            return $this->resolvedLookupRepository;
        }

        $this->resolvedLookupRepository = new MemberLookupRepository(
            $this->queryBuilder(),
            $this->tables(),
            null,
            $this->envConfig()
        );

        return $this->resolvedLookupRepository;
    }

    private function constraintRepository(): MemberConstraintRepository
    {
        if ($this->resolvedConstraintRepository instanceof MemberConstraintRepository) {
            return $this->resolvedConstraintRepository;
        }

        $this->resolvedConstraintRepository = new MemberConstraintRepository(
            $this->queryBuilder(),
            $this->tables(),
            null,
            $this->envConfig()
        );

        return $this->resolvedConstraintRepository;
    }
}
