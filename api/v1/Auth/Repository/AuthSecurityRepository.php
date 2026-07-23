<?php

/**
 * AuthSecurityRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Repository;

use Api\Core\Config\EnvConfig;
use Api\Core\Config\G5Config;
use Api\Core\Config\LegacyConfigProvider;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\Security\PasswordCompat;

final class AuthSecurityRepository extends AuthRepositorySupport
{
    private ?AuthLoginAttemptRepository $resolvedLoginAttemptRepository = null;
    private ?AuthTokenBlacklistRepository $resolvedTokenBlacklistRepository = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?PasswordCompat $passwordCompat = null,
        ?G5Config $configReader = null,
        ?EnvConfig $envConfig = null,
        ?LegacyConfigProvider $legacyConfigProvider = null,
        ?AuthLoginAttemptRepository $loginAttemptRepository = null,
        ?AuthTokenBlacklistRepository $tokenBlacklistRepository = null
    ) {
        parent::__construct($qb, $tables, $passwordCompat, $configReader, $envConfig, $legacyConfigProvider);
        $this->resolvedLoginAttemptRepository = $loginAttemptRepository;
        $this->resolvedTokenBlacklistRepository = $tokenBlacklistRepository;
    }

    public function isLoginBlocked(string $memberId, string $ipAddress, int $maxAttempts, int $windowSeconds): bool
    {
        return $this->loginAttemptRepository()->isLoginBlocked($memberId, $ipAddress, $maxAttempts, $windowSeconds);
    }

    public function registerFailedLoginAttempt(string $memberId, string $ipAddress): void
    {
        $this->loginAttemptRepository()->registerFailedLoginAttempt($memberId, $ipAddress);
    }

    public function clearFailedLoginAttempts(string $memberId, string $ipAddress): void
    {
        $this->loginAttemptRepository()->clearFailedLoginAttempts($memberId, $ipAddress);
    }

    public function updateTodayLogin(string $memberId, string $ipAddress): void
    {
        $this->loginAttemptRepository()->updateTodayLogin($memberId, $ipAddress);
    }

    public function revokeToken(string $memberId, string $jti, string $tokenType, int $expiresAt): void
    {
        $this->tokenBlacklistRepository()->revokeToken($memberId, $jti, $tokenType, $expiresAt);
    }

    public function isTokenRevoked(string $jti, string $tokenType): bool
    {
        return $this->tokenBlacklistRepository()->isTokenRevoked($jti, $tokenType);
    }

    private function loginAttemptRepository(): AuthLoginAttemptRepository
    {
        if ($this->resolvedLoginAttemptRepository instanceof AuthLoginAttemptRepository) {
            return $this->resolvedLoginAttemptRepository;
        }

        $this->resolvedLoginAttemptRepository = new AuthLoginAttemptRepository(
            $this->queryBuilder(),
            $this->tables(),
            null,
            null,
            $this->envConfig()
        );

        return $this->resolvedLoginAttemptRepository;
    }

    private function tokenBlacklistRepository(): AuthTokenBlacklistRepository
    {
        if ($this->resolvedTokenBlacklistRepository instanceof AuthTokenBlacklistRepository) {
            return $this->resolvedTokenBlacklistRepository;
        }

        $this->resolvedTokenBlacklistRepository = new AuthTokenBlacklistRepository(
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->resolvedTokenBlacklistRepository;
    }
}
