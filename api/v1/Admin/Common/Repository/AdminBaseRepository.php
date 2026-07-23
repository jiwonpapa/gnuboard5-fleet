<?php

/**
 * AdminBaseRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Common\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Common\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

abstract class AdminBaseRepository
{
    private ?QueryBuilder $resolvedQueryBuilder = null;

    private ?TableRegistry $resolvedTableRegistry = null;

    /** @var array<string, bool> */
    private array $tableExistsCache = [];

    /** @var array<string, bool> */
    private array $columnExistsCache = [];

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
     * @param array<string|int, mixed> $types
     * @return array<int, array<string, mixed>>
     */
    protected function fetchAllAssociative(string $sql, array $params = [], array $types = []): array
    {
        return $this->queryBuilder()->executeQuery($sql, $params, $types)->fetchAllAssociative();
    }

    /**
     * @param array<string, mixed> $params
     * @param array<string|int, mixed> $types
     */
    protected function executeStatement(string $sql, array $params = [], array $types = []): int
    {
        return $this->queryBuilder()->executeStatement($sql, $params, $types);
    }

    protected function lastInsertId(): int
    {
        return $this->queryBuilder()->lastInsertId();
    }

    protected function tableExists(string $table): bool
    {
        if (array_key_exists($table, $this->tableExistsCache)) {
            return $this->tableExistsCache[$table];
        }

        $row = $this->fetchAssociative(
            'SELECT COUNT(*) AS cnt
             FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :table_name',
            ['table_name' => $table]
        );

        return $this->tableExistsCache[$table] = ((int)($row['cnt'] ?? 0)) > 0;
    }

    protected function columnExists(string $table, string $column): bool
    {
        $cacheKey = $table . '.' . $column;
        if (array_key_exists($cacheKey, $this->columnExistsCache)) {
            return $this->columnExistsCache[$cacheKey];
        }

        $row = $this->fetchAssociative(
            'SELECT COUNT(*) AS cnt
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :table_name
               AND COLUMN_NAME = :column_name',
            [
                'table_name' => $table,
                'column_name' => $column,
            ]
        );

        return $this->columnExistsCache[$cacheKey] = ((int)($row['cnt'] ?? 0)) > 0;
    }
}
