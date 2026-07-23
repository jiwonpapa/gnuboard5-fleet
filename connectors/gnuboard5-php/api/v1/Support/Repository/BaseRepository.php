<?php

/**
 * BaseRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Support\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Support\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

abstract class BaseRepository
{
    private ?QueryBuilder $resolvedQueryBuilder = null;

    private ?TableRegistry $resolvedTableRegistry = null;

    public function __construct(
        private readonly ?QueryBuilder $qb = null,
        private readonly ?TableRegistry $tables = null
    ) {
    }

    protected function queryBuilder(): QueryBuilder
    {
        if ($this->resolvedQueryBuilder instanceof QueryBuilder) {
            return $this->resolvedQueryBuilder;
        }

        $this->resolvedQueryBuilder = $this->qb instanceof QueryBuilder
            ? $this->qb
            : new QueryBuilder();

        return $this->resolvedQueryBuilder;
    }

    protected function tables(): TableRegistry
    {
        if ($this->resolvedTableRegistry instanceof TableRegistry) {
            return $this->resolvedTableRegistry;
        }

        $this->resolvedTableRegistry = $this->tables instanceof TableRegistry
            ? $this->tables
            : new TableRegistry();

        return $this->resolvedTableRegistry;
    }

    protected function fetchAssociative(string $sql, array $params = []): array|false
    {
        return $this->queryBuilder()->executeQuery($sql, $params)->fetchAssociative();
    }

    /**
     * @param array<string, mixed> $params
     * @return array<int, array<string, mixed>>
     */
    protected function fetchAllAssociative(string $sql, array $params = []): array
    {
        return $this->queryBuilder()->executeQuery($sql, $params)->fetchAllAssociative();
    }

    /**
     * @param array<string, mixed> $params
     */
    protected function executeStatement(string $sql, array $params = []): int
    {
        return $this->queryBuilder()->executeStatement($sql, $params);
    }

    protected function lastInsertId(): int
    {
        return $this->queryBuilder()->lastInsertId();
    }
}
