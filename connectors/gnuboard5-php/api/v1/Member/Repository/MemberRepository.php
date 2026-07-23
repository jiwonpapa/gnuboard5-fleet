<?php

/**
 * MemberRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Member\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Repository;

use Api\Integration\Contracts\MemberGateway;

final class MemberRepository implements MemberGateway
{
    private readonly MemberQueryRepository $queryRepository;
    private readonly MemberMutationRepository $mutationRepository;
    private readonly MemberValidationRepository $validationRepository;

    public function __construct(
        MemberQueryRepository $queryRepository,
        MemberMutationRepository $mutationRepository,
        MemberValidationRepository $validationRepository
    ) {
        $this->queryRepository = $queryRepository;
        $this->mutationRepository = $mutationRepository;
        $this->validationRepository = $validationRepository;
    }

    public function findById(string $memberId): ?array
    {
        return $this->queryRepository->findById($memberId);
    }

    public function getMemberImageConfig(): array
    {
        return $this->queryRepository->getMemberImageConfig();
    }

    public function update(string $memberId, array $updates): void
    {
        $this->mutationRepository->update($memberId, $updates);
    }

    public function withdraw(string $memberId, string $leaveDate, string $memo): void
    {
        $this->mutationRepository->withdraw($memberId, $leaveDate, $memo);
    }

    public function existsNick(string $nickname, string $memberId): bool
    {
        return $this->queryRepository->existsNick($nickname, $memberId);
    }

    public function existsEmail(string $email, string $memberId): bool
    {
        return $this->queryRepository->existsEmail($email, $memberId);
    }

    public function verifyPassword(array $member, string $password): bool
    {
        return $this->validationRepository->verifyPassword($member, $password);
    }

    public function validatePassword(string $password): void
    {
        $this->validationRepository->validatePassword($password);
    }

    public function hashPassword(string $password): string
    {
        return $this->validationRepository->hashPassword($password);
    }

    public function validateNicknameForUpdate(string $nickname, string $memberId): void
    {
        $this->validationRepository->validateNicknameForUpdate($nickname, $memberId);
    }

    public function validateEmailForUpdate(string $email, string $memberId): void
    {
        $this->validationRepository->validateEmailForUpdate($email, $memberId);
    }

    public function validatePhoneForUpdate(string $phone, string $memberId): void
    {
        $this->validationRepository->validatePhoneForUpdate($phone, $memberId);
    }
}
