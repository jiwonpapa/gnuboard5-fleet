<?php

/**
 * PostRepositorySupport API module.
 *
 * @package  Gnuboard5\Api\v1\Post\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Integration\Contracts\BoardGateway;
use Api\Support\Repository\BaseRepository;

abstract class PostRepositorySupport extends BaseRepository
{
    public function __construct(
        protected readonly BoardGateway $boardRepository,
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null
    ) {
        parent::__construct($qb, $tables);
    }
}
