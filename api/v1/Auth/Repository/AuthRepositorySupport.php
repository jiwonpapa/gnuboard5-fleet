<?php

/**
 * AuthRepositorySupport API module.
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
use Api\Core\Security\PasswordPolicy;
use Api\Support\Repository\BaseRepository;

abstract class AuthRepositorySupport extends BaseRepository
{
    use AuthRepositoryConfigSupport;
    use AuthRepositoryInputSupport;
    use AuthRepositoryTimedTokenSupport;

    private ?AuthInputNormalizer $resolvedInputNormalizer = null;
    private ?AuthTimedTokenCodec $resolvedTimedTokenCodec = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        private readonly ?PasswordCompat $passwordCompat = null,
        private readonly ?G5Config $configReader = null,
        private readonly ?EnvConfig $envConfig = null,
        private readonly ?LegacyConfigProvider $legacyConfigProvider = null,
        ?AuthInputNormalizer $inputNormalizer = null,
        ?AuthTimedTokenCodec $timedTokenCodec = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedInputNormalizer = $inputNormalizer;
        $this->resolvedTimedTokenCodec = $timedTokenCodec;
    }
}
