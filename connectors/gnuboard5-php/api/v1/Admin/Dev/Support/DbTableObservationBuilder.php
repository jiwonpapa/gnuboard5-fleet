<?php

declare(strict_types=1);

namespace Api\Admin\Dev\Support;

use Api\Core\Database\QueryBuilder;

final class DbTableObservationBuilder
{
    public function __construct(
        private readonly ?QueryBuilder $queryBuilder = null,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function build(string $table, int $sampleLimit = 1): array
    {
        $table = trim($table);
        if ($table === '') {
            return [
                'status' => 'blocked',
                'reason' => 'table 값이 비어 있습니다.',
                'table' => $table,
            ];
        }
        if (preg_match('/^[A-Za-z0-9_]+$/', $table) !== 1) {
            return [
                'status' => 'blocked',
                'reason' => '지원하지 않는 테이블명 형식입니다.',
                'table' => $table,
            ];
        }

        if ($sampleLimit < 1) {
            $sampleLimit = 1;
        }

        try {
            $queryBuilder = $this->queryBuilder ?? new QueryBuilder();
        } catch (\Throwable $exception) {
            return [
                'status' => 'blocked',
                'reason' => 'DB 연결 초기화에 실패했습니다. (.env 또는 DB 환경변수 확인 필요)',
                'table' => $table,
                'error' => $exception->getMessage(),
            ];
        }
        $escapedTable = str_replace('`', '``', $table);
        try {
            $columnRows = $queryBuilder->executeQuery("SHOW FULL COLUMNS FROM `{$escapedTable}`")->fetchAllAssociative();
            $indexRows = $queryBuilder->executeQuery("SHOW INDEX FROM `{$escapedTable}`")->fetchAllAssociative();
            $sampleRows = $queryBuilder->executeQuery("SELECT * FROM `{$escapedTable}` LIMIT {$sampleLimit}")->fetchAllAssociative();
        } catch (\Throwable $exception) {
            return [
                'status' => 'blocked',
                'reason' => 'DB introspection 쿼리 실행에 실패했습니다.',
                'table' => $table,
                'error' => $exception->getMessage(),
            ];
        }

        $columns = [];
        foreach ($columnRows as $row) {
            $columns[] = [
                'name' => (string)($row['Field'] ?? ''),
                'sql_type' => (string)($row['Type'] ?? ''),
                'nullable' => strtoupper((string)($row['Null'] ?? '')) === 'YES',
                'key' => (string)($row['Key'] ?? ''),
                'default' => $row['Default'] ?? null,
                'extra' => (string)($row['Extra'] ?? ''),
                'comment' => (string)($row['Comment'] ?? ''),
            ];
        }

        $indexes = [];
        foreach ($indexRows as $row) {
            $indexName = (string)($row['Key_name'] ?? '');
            if ($indexName === '') {
                continue;
            }

            if (!isset($indexes[$indexName])) {
                $indexes[$indexName] = [
                    'name' => $indexName,
                    'unique' => ((string)($row['Non_unique'] ?? '1')) === '0',
                    'columns' => [],
                    'index_type' => (string)($row['Index_type'] ?? ''),
                ];
            }

            $indexes[$indexName]['columns'][] = (string)($row['Column_name'] ?? '');
        }

        return [
            'status' => 'ok',
            'table' => $table,
            'column_count' => count($columns),
            'columns' => $columns,
            'indexes' => array_values($indexes),
            'sample_row_count' => count($sampleRows),
            'sample_rows' => $sampleRows,
        ];
    }
}
