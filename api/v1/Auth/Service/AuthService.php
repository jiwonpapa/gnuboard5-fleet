<?php

/**
 * AuthService API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Auth\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Service;

use Api\Auth\Contracts\AuthGateway;
use Api\Security\JwtService;

final class AuthService
{
    private readonly AuthSessionService $sessionService;
    private readonly AuthRegistrationService $registrationService;
    private readonly AuthRecoveryService $recoveryService;
    private readonly AuthAvailabilityService $availabilityService;

    public function __construct(
        AuthGateway $authGateway,
        JwtService $jwtService,
        AuthSessionService $sessionService,
        AuthRegistrationService $registrationService,
        AuthRecoveryService $recoveryService,
        AuthAvailabilityService $availabilityService
    ) {
        self::touchDependencies($authGateway, $jwtService);
        $this->sessionService = $sessionService;
        $this->registrationService = $registrationService;
        $this->recoveryService = $recoveryService;
        $this->availabilityService = $availabilityService;
    }

    public function login(string $memberId, string $password, string $ipAddress): array
    {
        return $this->sessionService->login($memberId, $password, $ipAddress);
    }

    public function register(array $member): array
    {
        return $this->registrationService->register($member);
    }

    public function refresh(string $refreshToken): array
    {
        return $this->sessionService->refresh($refreshToken);
    }

    public function logout(array $member, array $accessPayload, ?string $refreshToken): array
    {
        return $this->sessionService->logout($member, $accessPayload, $refreshToken);
    }

    public function requestPasswordReset(string $email, ?string $memberId = null): array
    {
        return $this->recoveryService->requestPasswordReset($email, $memberId);
    }

    public function confirmPasswordReset(string $memberId, string $resetToken, string $newPassword): void
    {
        $this->recoveryService->confirmPasswordReset($memberId, $resetToken, $newPassword);
    }

    public function requestEmailVerification(array $member, ?string $email = null): array
    {
        return $this->recoveryService->requestEmailVerification($member, $email);
    }

    public function requestEmailReverification(string $memberId, string $password, ?string $email = null): array
    {
        return $this->recoveryService->requestEmailReverification($memberId, $password, $email);
    }

    public function confirmEmailVerification(string $memberId, string $verifyToken): void
    {
        $this->recoveryService->confirmEmailVerification($memberId, $verifyToken);
    }

    public function checkMemberIdAvailability(string $value): array
    {
        return $this->availabilityService->memberId($value);
    }

    public function checkNickAvailability(string $value): array
    {
        return $this->availabilityService->nick($value);
    }

    public function checkEmailAvailability(string $value): array
    {
        return $this->availabilityService->email($value);
    }

    public function checkPhoneAvailability(string $value): array
    {
        return $this->availabilityService->phone($value);
    }

    public function checkRecommenderAvailability(string $value): array
    {
        return $this->availabilityService->recommender($value);
    }

    private static function touchDependencies(mixed ...$dependencies): void
    {
    }
}
