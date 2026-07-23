<?php

declare(strict_types=1);

namespace Api\Admin\Schema\Support;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class AdminSchemaRuntimeStateProvider
{
    /**
     * @param array<string, mixed>|null $configValues
     * @param list<string>|null $memberIds
     */
    public function __construct(
        private readonly ?array $configValues = null,
        private readonly ?array $memberIds = null,
        private readonly ?QueryBuilder $queryBuilder = null,
        private readonly ?TableRegistry $tableRegistry = null,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function configValues(): array
    {
        if (is_array($this->configValues)) {
            return $this->configValues;
        }

        $globalConfig = $GLOBALS['config'] ?? null;
        if (is_array($globalConfig)) {
            return $globalConfig;
        }

        $queryBuilder = $this->resolveQueryBuilder();
        $tableRegistry = $this->resolveTableRegistry();
        if ($queryBuilder !== null && $tableRegistry !== null) {
            try {
                $table = $tableRegistry->get('config');
                $row = $queryBuilder->executeQuery("SELECT * FROM {$table} LIMIT 1")->fetchAssociative();
                if (is_array($row)) {
                    return $row;
                }
            } catch (\Throwable) {
                return [];
            }
        }

        return [];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public function memberOptions(int $minimumLevel): array
    {
        $memberIds = $this->memberIds;
        if ($memberIds === null && function_exists('sql_query') && function_exists('sql_fetch_array') && isset($GLOBALS['g5']['member_table'])) {
            $table = (string)$GLOBALS['g5']['member_table'];
            $memberIds = [];
            $result = sql_query(" select mb_id from {$table} where mb_level >= '{$minimumLevel}' ");
            while (true) {
                $row = sql_fetch_array($result);
                if ($row === false) {
                    break;
                }

                $memberIds[] = (string)($row['mb_id'] ?? '');
            }
        }

        if ($memberIds === null) {
            $queryBuilder = $this->resolveQueryBuilder();
            $tableRegistry = $this->resolveTableRegistry();
            if ($queryBuilder !== null && $tableRegistry !== null) {
                try {
                    $table = $tableRegistry->get('member');
                    $memberIds = [];
                    $result = $queryBuilder->executeQuery(
                        "SELECT mb_id FROM {$table} WHERE mb_level >= :minimum_level ORDER BY mb_id ASC",
                        ['minimum_level' => $minimumLevel]
                    );
                    foreach ($result->fetchAllAssociative() as $row) {
                        $memberIds[] = (string)($row['mb_id'] ?? '');
                    }
                } catch (\Throwable) {
                    $memberIds = [];
                }
            }
        }

        $memberIds = array_values(
            array_filter(
                array_map('strval', $memberIds ?? []),
                static fn (string $id): bool => $id !== ''
            )
        );
        if ($memberIds === []) {
            return [];
        }

        $options = [['value' => '', 'label' => '선택안함']];
        foreach ($memberIds as $memberId) {
            $options[] = ['value' => $memberId, 'label' => $memberId];
        }

        return $options;
    }

    private function resolveQueryBuilder(): ?QueryBuilder
    {
        if ($this->queryBuilder instanceof QueryBuilder) {
            return $this->queryBuilder;
        }

        try {
            return new QueryBuilder();
        } catch (\Throwable) {
            return null;
        }
    }

    private function resolveTableRegistry(): ?TableRegistry
    {
        if ($this->tableRegistry instanceof TableRegistry) {
            return $this->tableRegistry;
        }

        try {
            return new TableRegistry();
        } catch (\Throwable) {
            return null;
        }
    }
}
