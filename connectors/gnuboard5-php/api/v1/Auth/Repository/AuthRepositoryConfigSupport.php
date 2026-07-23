<?php

declare(strict_types=1);

namespace Api\Auth\Repository;

use Api\Core\Config\EnvConfig;
use Api\Core\Config\G5Config;
use Api\Core\Config\LegacyConfigProvider;
use Api\Core\Security\PasswordCompat;
use Api\Core\Security\PasswordPolicy;
use Throwable;

trait AuthRepositoryConfigSupport
{
    protected function password(): PasswordCompat
    {
        if ($this->passwordCompat instanceof PasswordCompat) {
            return $this->passwordCompat;
        }

        return new PasswordCompat($this->envConfig());
    }

    protected function passwordPolicy(): PasswordPolicy
    {
        return new PasswordPolicy();
    }

    /**
     * @return array<string, mixed>
     */
    protected function loadConfig(): array
    {
        try {
            if ($this->configReader instanceof G5Config) {
                return $this->configReader->getAll();
            }

            return (new G5Config($this->queryBuilder(), $this->tables()))->getAll();
        } catch (Throwable) {
            return $this->legacyConfigProvider()->all();
        }
    }

    protected function legacyConfigProvider(): LegacyConfigProvider
    {
        return $this->legacyConfigProvider ?? new LegacyConfigProvider();
    }

    protected function passwordResetTtlSeconds(): int
    {
        return $this->envConfig()->authPasswordResetTtlSeconds;
    }

    protected function emailVerifyTtlSeconds(): int
    {
        return $this->envConfig()->authEmailVerifyTtlSeconds;
    }

    protected function envConfig(): EnvConfig
    {
        return $this->envConfig ?? EnvConfig::fromEnv();
    }
}
