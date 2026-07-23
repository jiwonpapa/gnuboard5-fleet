<?php

/**
 * AuthMemberRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Repository;

final class AuthMemberRepository
{
    private readonly AuthMemberQueryRepository $queryRepository;
    private readonly AuthMemberValidationRepository $validationRepository;
    private readonly AuthMemberRegistrationRepository $registrationRepository;

    public function __construct(
        AuthMemberQueryRepository $queryRepository,
        AuthMemberValidationRepository $validationRepository,
        AuthMemberRegistrationRepository $registrationRepository
    ) {
        $this->queryRepository = $queryRepository;
        $this->validationRepository = $validationRepository;
        $this->registrationRepository = $registrationRepository;
    }

    public function findMemberById(string $memberId): ?array
    {
        return $this->queryRepository->findMemberById($memberId);
    }

    public function findMemberByEmail(string $email): ?array
    {
        return $this->queryRepository->findMemberByEmail($email);
    }

    public function countMembersByEmail(string $email): int
    {
        return $this->queryRepository->countMembersByEmail($email);
    }

    public function isRecommendationEnabled(): bool
    {
        return $this->queryRepository->isRecommendationEnabled();
    }

    public function isMemberActive(string $memberId): bool
    {
        return $this->queryRepository->isMemberActive($memberId);
    }

    public function verifyPassword(array $member, string $password): bool
    {
        return $this->queryRepository->verifyPassword($member, $password);
    }

    public function isEmailCertificationRequiredAndMissing(array $member): bool
    {
        return $this->queryRepository->isEmailCertificationRequiredAndMissing($member);
    }

    public function rehashPasswordIfNeeded(array $member, string $plainPassword): void
    {
        $this->queryRepository->rehashPasswordIfNeeded($member, $plainPassword);
    }

    public function hashPassword(string $plainPassword): string
    {
        return $this->queryRepository->hashPassword($plainPassword);
    }

    public function validateRegisterPassword(string $password): void
    {
        $this->validationRepository->validateRegisterPassword($password);
    }

    public function validateRegisterMemberId(string $memberId): void
    {
        $this->validationRepository->validateRegisterMemberId($memberId);
    }

    public function validateRegisterNick(string $nick): void
    {
        $this->validationRepository->validateRegisterNick($nick);
    }

    public function validateRegisterEmail(string $email): void
    {
        $this->validationRepository->validateRegisterEmail($email);
    }

    public function validateRegisterPhone(string $phone): void
    {
        $this->validationRepository->validateRegisterPhone($phone);
    }

    public function registerMember(array $member): array
    {
        return $this->registrationRepository->registerMember($member);
    }
}
