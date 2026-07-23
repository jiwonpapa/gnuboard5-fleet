<?php

/**
 * MemberRepositorySupport API module.
 *
 * @package  Gnuboard5\Api\v1\Member\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Repository;

use Api\Core\Config\EnvConfig;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\Security\PasswordCompat;
use Api\Core\Security\PasswordPolicy;
use Api\Support\Repository\BaseRepository;

abstract class MemberRepositorySupport extends BaseRepository
{
    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        private readonly ?PasswordCompat $passwordCompat = null,
        private readonly ?EnvConfig $envConfig = null
    ) {
        parent::__construct($qb, $tables);
    }

    protected function getMemberTable(): string
    {
        return $this->tables()->get('member');
    }

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

    protected function envConfig(): EnvConfig
    {
        return $this->envConfig ?? EnvConfig::fromEnv();
    }
}
