<?php

declare(strict_types=1);

namespace Api\Auth\Contracts;

interface AuthSessionGateway
{
    public function isLoginBlocked(string $memberId, string $ipAddress, int $maxAttempts, int $windowSeconds): bool;

    public function registerFailedLoginAttempt(string $memberId, string $ipAddress): void;

    public function clearFailedLoginAttempts(string $memberId, string $ipAddress): void;

    public function updateTodayLogin(string $memberId, string $ipAddress): void;

    public function revokeToken(string $memberId, string $jti, string $tokenType, int $expiresAt): void;

    public function isTokenRevoked(string $jti, string $tokenType): bool;

    public function rehashPasswordIfNeeded(array $member, string $plainPassword): void;
}
