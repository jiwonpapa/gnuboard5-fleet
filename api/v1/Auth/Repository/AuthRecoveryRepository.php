<?php

/**
 * AuthRecoveryRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Repository;

use Api\Auth\Support\AuthInputNormalizer;
use Api\Auth\Support\AuthTimedTokenCodec;
use Api\Core\Config\EnvConfig;
use Api\Core\Config\G5Config;
use Api\Core\Config\LegacyConfigProvider;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\Security\PasswordCompat;

final class AuthRecoveryRepository extends AuthRepositorySupport
{
    private readonly ?QueryBuilder $baseQueryBuilder;
    private readonly ?TableRegistry $baseTables;
    private readonly ?PasswordCompat $basePasswordCompat;
    private readonly ?G5Config $baseConfigReader;
    private readonly ?EnvConfig $baseEnvConfig;
    private readonly ?LegacyConfigProvider $baseLegacyConfigProvider;
    private readonly ?AuthInputNormalizer $baseInputNormalizer;
    private readonly ?AuthTimedTokenCodec $baseTimedTokenCodec;
    private ?AuthPasswordRecoveryStore $resolvedPasswordRecoveryStore = null;
    private ?AuthEmailRecoveryStore $resolvedEmailRecoveryStore = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?PasswordCompat $passwordCompat = null,
        ?G5Config $configReader = null,
        ?EnvConfig $envConfig = null,
        ?LegacyConfigProvider $legacyConfigProvider = null,
        ?AuthInputNormalizer $inputNormalizer = null,
        ?AuthTimedTokenCodec $timedTokenCodec = null,
        ?AuthPasswordRecoveryStore $passwordRecoveryStore = null,
        ?AuthEmailRecoveryStore $emailRecoveryStore = null
    ) {
        parent::__construct(
            $qb,
            $tables,
            $passwordCompat,
            $configReader,
            $envConfig,
            $legacyConfigProvider,
            $inputNormalizer,
            $timedTokenCodec
        );

        $this->baseQueryBuilder = $qb;
        $this->baseTables = $tables;
        $this->basePasswordCompat = $passwordCompat;
        $this->baseConfigReader = $configReader;
        $this->baseEnvConfig = $envConfig;
        $this->baseLegacyConfigProvider = $legacyConfigProvider;
        $this->baseInputNormalizer = $inputNormalizer;
        $this->baseTimedTokenCodec = $timedTokenCodec;
        $this->resolvedPasswordRecoveryStore = $passwordRecoveryStore;
        $this->resolvedEmailRecoveryStore = $emailRecoveryStore;
    }

    public function createPasswordResetToken(string $memberId): string
    {
        return $this->passwordRecoveryStore()->createPasswordResetToken($memberId);
    }

    public function resetPasswordByToken(string $memberId, string $token, string $newPassword): void
    {
        $this->passwordRecoveryStore()->resetPasswordByToken($memberId, $token, $newPassword);
    }

    public function issueEmailVerifyToken(string $memberId, ?string $email = null): string
    {
        return $this->emailRecoveryStore()->issueEmailVerifyToken($memberId, $email);
    }

    public function confirmEmailVerifyToken(string $memberId, string $token): void
    {
        $this->emailRecoveryStore()->confirmEmailVerifyToken($memberId, $token);
    }

    private function passwordRecoveryStore(): AuthPasswordRecoveryStore
    {
        if ($this->resolvedPasswordRecoveryStore instanceof AuthPasswordRecoveryStore) {
            return $this->resolvedPasswordRecoveryStore;
        }

        $this->resolvedPasswordRecoveryStore = new AuthPasswordRecoveryStore(
            $this->baseQueryBuilder,
            $this->baseTables,
            $this->basePasswordCompat,
            $this->baseConfigReader,
            $this->baseEnvConfig,
            $this->baseLegacyConfigProvider,
            $this->baseInputNormalizer,
            $this->baseTimedTokenCodec
        );

        return $this->resolvedPasswordRecoveryStore;
    }

    private function emailRecoveryStore(): AuthEmailRecoveryStore
    {
        if ($this->resolvedEmailRecoveryStore instanceof AuthEmailRecoveryStore) {
            return $this->resolvedEmailRecoveryStore;
        }

        $this->resolvedEmailRecoveryStore = new AuthEmailRecoveryStore(
            $this->baseQueryBuilder,
            $this->baseTables,
            $this->basePasswordCompat,
            $this->baseConfigReader,
            $this->baseEnvConfig,
            $this->baseLegacyConfigProvider,
            $this->baseInputNormalizer,
            $this->baseTimedTokenCodec
        );

        return $this->resolvedEmailRecoveryStore;
    }
}
