<?php

/**
 * MemberConstraintRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Member\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Repository;

final class MemberConstraintRepository extends MemberRepositorySupport
{
    private ?MemberUniquenessRepository $resolvedUniquenessRepository = null;
    private ?MemberPolicyConstraintRepository $resolvedPolicyRepository = null;

    public function __construct(
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null,
        ?\Api\Core\Security\PasswordCompat $passwordCompat = null,
        ?\Api\Core\Config\EnvConfig $envConfig = null,
        ?MemberUniquenessRepository $uniquenessRepository = null,
        ?MemberPolicyConstraintRepository $policyRepository = null
    ) {
        parent::__construct($qb, $tables, $passwordCompat, $envConfig);
        $this->resolvedUniquenessRepository = $uniquenessRepository;
        $this->resolvedPolicyRepository = $policyRepository;
    }

    public function existsNick(string $nickname, string $memberId): bool
    {
        return $this->uniquenessRepository()->existsNick($nickname, $memberId);
    }

    public function existsEmail(string $email, string $memberId): bool
    {
        return $this->uniquenessRepository()->existsEmail($email, $memberId);
    }

    public function existsHpForOther(string $phone, string $memberId): bool
    {
        return $this->uniquenessRepository()->existsHpForOther($phone, $memberId);
    }

    public function getNicknameCooldownDays(): int
    {
        return $this->policyRepository()->getNicknameCooldownDays();
    }

    public function isReservedNick(string $nick): bool
    {
        return $this->policyRepository()->isReservedNick($nick);
    }

    public function isProhibitedEmailDomain(string $email): bool
    {
        return $this->policyRepository()->isProhibitedEmailDomain($email);
    }

    private function uniquenessRepository(): MemberUniquenessRepository
    {
        if ($this->resolvedUniquenessRepository instanceof MemberUniquenessRepository) {
            return $this->resolvedUniquenessRepository;
        }

        $this->resolvedUniquenessRepository = new MemberUniquenessRepository(
            $this->queryBuilder(),
            $this->tables(),
            $this->password(),
            $this->envConfig()
        );

        return $this->resolvedUniquenessRepository;
    }

    private function policyRepository(): MemberPolicyConstraintRepository
    {
        if ($this->resolvedPolicyRepository instanceof MemberPolicyConstraintRepository) {
            return $this->resolvedPolicyRepository;
        }

        $this->resolvedPolicyRepository = new MemberPolicyConstraintRepository(
            $this->queryBuilder(),
            $this->tables(),
            $this->password(),
            $this->envConfig()
        );

        return $this->resolvedPolicyRepository;
    }
}
