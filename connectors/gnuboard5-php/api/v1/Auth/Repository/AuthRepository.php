<?php

/**
 * AuthRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Repository;

use Api\Auth\Contracts\AuthGateway;
use Api\Auth\Contracts\AuthIdentityGateway;
use Api\Auth\Contracts\AuthRecoveryGateway;
use Api\Auth\Contracts\AuthRegistrationGateway;
use Api\Auth\Contracts\AuthSessionGateway;
use Api\Integration\Contracts\AuthGateway as LegacyAuthGateway;

final class AuthRepository implements AuthGateway, AuthIdentityGateway, AuthRegistrationGateway, AuthSessionGateway, AuthRecoveryGateway, LegacyAuthGateway
{
    private readonly AuthMemberRepository $memberRepository;
    private readonly AuthSecurityRepository $securityRepository;
    private readonly AuthRecoveryRepository $recoveryRepository;

    public function __construct(
        AuthMemberRepository $memberRepository,
        AuthSecurityRepository $securityRepository,
        AuthRecoveryRepository $recoveryRepository
    ) {
        $this->memberRepository = $memberRepository;
        $this->securityRepository = $securityRepository;
        $this->recoveryRepository = $recoveryRepository;
    }

    public function findMemberById(string $memberId): ?array
    {
        return $this->memberRepository->findMemberById($memberId);
    }

    public function findMemberByEmail(string $email): ?array
    {
        return $this->memberRepository->findMemberByEmail($email);
    }

    public function countMembersByEmail(string $email): int
    {
        return $this->memberRepository->countMembersByEmail($email);
    }

    public function isRecommendationEnabled(): bool
    {
        return $this->memberRepository->isRecommendationEnabled();
    }

    public function isMemberActive(string $memberId): bool
    {
        return $this->memberRepository->isMemberActive($memberId);
    }

    public function verifyPassword(array $member, string $password): bool
    {
        return $this->memberRepository->verifyPassword($member, $password);
    }

    public function isEmailCertificationRequiredAndMissing(array $member): bool
    {
        return $this->memberRepository->isEmailCertificationRequiredAndMissing($member);
    }

    public function rehashPasswordIfNeeded(array $member, string $plainPassword): void
    {
        $this->memberRepository->rehashPasswordIfNeeded($member, $plainPassword);
    }

    public function hashPassword(string $plainPassword): string
    {
        return $this->memberRepository->hashPassword($plainPassword);
    }

    public function validateRegisterPassword(string $password): void
    {
        $this->memberRepository->validateRegisterPassword($password);
    }

    public function validateRegisterMemberId(string $memberId): void
    {
        $this->memberRepository->validateRegisterMemberId($memberId);
    }

    public function validateRegisterNick(string $nick): void
    {
        $this->memberRepository->validateRegisterNick($nick);
    }

    public function validateRegisterEmail(string $email): void
    {
        $this->memberRepository->validateRegisterEmail($email);
    }

    public function validateRegisterPhone(string $phone): void
    {
        $this->memberRepository->validateRegisterPhone($phone);
    }

    public function registerMember(array $member): array
    {
        return $this->memberRepository->registerMember($member);
    }

    public function isLoginBlocked(string $memberId, string $ipAddress, int $maxAttempts, int $windowSeconds): bool
    {
        return $this->securityRepository->isLoginBlocked($memberId, $ipAddress, $maxAttempts, $windowSeconds);
    }

    public function registerFailedLoginAttempt(string $memberId, string $ipAddress): void
    {
        $this->securityRepository->registerFailedLoginAttempt($memberId, $ipAddress);
    }

    public function clearFailedLoginAttempts(string $memberId, string $ipAddress): void
    {
        $this->securityRepository->clearFailedLoginAttempts($memberId, $ipAddress);
    }

    public function updateTodayLogin(string $memberId, string $ipAddress): void
    {
        $this->securityRepository->updateTodayLogin($memberId, $ipAddress);
    }

    public function revokeToken(string $memberId, string $jti, string $tokenType, int $expiresAt): void
    {
        $this->securityRepository->revokeToken($memberId, $jti, $tokenType, $expiresAt);
    }

    public function isTokenRevoked(string $jti, string $tokenType): bool
    {
        return $this->securityRepository->isTokenRevoked($jti, $tokenType);
    }

    public function createPasswordResetToken(string $memberId): string
    {
        return $this->recoveryRepository->createPasswordResetToken($memberId);
    }

    public function resetPasswordByToken(string $memberId, string $token, string $newPassword): void
    {
        $this->recoveryRepository->resetPasswordByToken($memberId, $token, $newPassword);
    }

    public function issueEmailVerifyToken(string $memberId, ?string $email = null): string
    {
        return $this->recoveryRepository->issueEmailVerifyToken($memberId, $email);
    }

    public function confirmEmailVerifyToken(string $memberId, string $token): void
    {
        $this->recoveryRepository->confirmEmailVerifyToken($memberId, $token);
    }
}
