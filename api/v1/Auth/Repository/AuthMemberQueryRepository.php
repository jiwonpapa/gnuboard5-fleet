<?php

/**
 * AuthMemberQueryRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Repository;

final class AuthMemberQueryRepository extends AuthRepositorySupport
{
    private ?AuthMemberLookupRepository $lookupRepository = null;

    private ?AuthMemberPolicyRepository $policyRepository = null;

    public function findMemberById(string $memberId): ?array
    {
        return $this->lookupRepository()->findMemberById($memberId);
    }

    public function findMemberByEmail(string $email): ?array
    {
        return $this->lookupRepository()->findMemberByEmail($email);
    }

    public function countMembersByEmail(string $email): int
    {
        return $this->lookupRepository()->countMembersByEmail($email);
    }

    public function isRecommendationEnabled(): bool
    {
        return $this->policyRepository()->isRecommendationEnabled();
    }

    public function isMemberActive(string $memberId): bool
    {
        return $this->lookupRepository()->isMemberActive($memberId);
    }

    public function verifyPassword(array $member, string $password): bool
    {
        return $this->policyRepository()->verifyPassword($member, $password);
    }

    public function isEmailCertificationRequiredAndMissing(array $member): bool
    {
        return $this->policyRepository()->isEmailCertificationRequiredAndMissing($member);
    }

    public function rehashPasswordIfNeeded(array $member, string $plainPassword): void
    {
        $this->policyRepository()->rehashPasswordIfNeeded($member, $plainPassword);
    }

    public function hashPassword(string $plainPassword): string
    {
        return $this->policyRepository()->hashPassword($plainPassword);
    }

    public function existsMemberId(string $memberId): bool
    {
        return $this->lookupRepository()->existsMemberId($memberId);
    }

    public function existsNick(string $nick): bool
    {
        return $this->lookupRepository()->existsNick($nick);
    }

    public function existsEmail(string $email): bool
    {
        return $this->lookupRepository()->existsEmail($email);
    }

    public function existsHp(string $phone): bool
    {
        return $this->lookupRepository()->existsHp($phone);
    }

    public function isReservedNick(string $nick): bool
    {
        return $this->policyRepository()->isReservedNick($nick);
    }

    /**
     * @return list<string>
     */
    public function mergedProhibitMemberIds(): array
    {
        return $this->policyRepository()->mergedProhibitMemberIds();
    }

    /**
     * @return list<string>
     */
    public function mergedProhibitEmailDomains(): array
    {
        return $this->policyRepository()->mergedProhibitEmailDomains();
    }

    private function lookupRepository(): AuthMemberLookupRepository
    {
        if ($this->lookupRepository instanceof AuthMemberLookupRepository) {
            return $this->lookupRepository;
        }

        return $this->lookupRepository = new AuthMemberLookupRepository(
            $this->queryBuilder(),
            $this->tables(),
            $this->password(),
            envConfig: $this->envConfig(),
            legacyConfigProvider: $this->legacyConfigProvider()
        );
    }

    private function policyRepository(): AuthMemberPolicyRepository
    {
        if ($this->policyRepository instanceof AuthMemberPolicyRepository) {
            return $this->policyRepository;
        }

        return $this->policyRepository = new AuthMemberPolicyRepository(
            $this->queryBuilder(),
            $this->tables(),
            $this->password(),
            envConfig: $this->envConfig(),
            legacyConfigProvider: $this->legacyConfigProvider()
        );
    }
}
