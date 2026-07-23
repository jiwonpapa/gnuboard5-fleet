<?php

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Repository;

/**
 * Catalog 카테고리 Repository.
 *
 * @package  Api\Admin\Shop\Catalog\Repository
 * @since    v1.0.0
 */
final class AdminShopCatalogCategoryRepository extends AdminShopCatalogRepositoryBase
{
    public function listCategories(int $page, int $perPage): array
    {
        $table = $this->shopTable('category');
        if (!$this->tableExists($table)) {
            return ['total' => 0, 'items' => []];
        }

        $count = (int)($this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$table}")['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT * FROM {$table} ORDER BY ca_id DESC LIMIT {$perPage} OFFSET {$offset}"
        );

        return [
            'total' => $count,
            'items' => $items,
        ];
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function createCategory(array $payload): array
    {
        $table = $this->shopTable('category');
        if (!$this->tableExists($table)) {
            return [];
        }

        $payload = $this->filterPayload($table, $payload);
        if ($payload === []) {
            return [];
        }

        $fields = [];
        $placeholders = [];
        $params = [];
        foreach ($payload as $field => $value) {
            $fields[] = $field;
            $params[$field] = $value;
            $placeholders[] = ':' . $field;
        }

        $this->executeStatement(
            sprintf(
                'INSERT INTO %s (%s) VALUES (%s)',
                $table,
                implode(', ', $fields),
                implode(', ', $placeholders)
            ),
            $params
        );

        $categoryId = (string)($payload[self::CATEGORY_ID] ?? '');
        if ($categoryId === '') {
            return [];
        }

        return $this->findCategory($categoryId) ?? [];
    }

    public function findCategory(string $categoryId): ?array
    {
        $table = $this->shopTable('category');
        if (!$this->tableExists($table)) {
            return null;
        }

        $row = $this->fetchAssociative(
            "SELECT * FROM {$table} WHERE ca_id = :ca_id LIMIT 1",
            ['ca_id' => $categoryId]
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function updateCategory(string $categoryId, array $payload): array
    {
        $table = $this->shopTable('category');
        if (!$this->tableExists($table)) {
            return [];
        }

        $payload = $this->filterPayload($table, $payload, [self::CATEGORY_ID]);
        if ($payload === []) {
            return [];
        }

        $set = [];
        $params = ['ca_id' => $categoryId];
        foreach ($payload as $field => $value) {
            $param = 'u_' . $field;
            $set[] = $field . ' = :' . $param;
            $params[$param] = $value;
        }

        $affected = $this->executeStatement(
            sprintf(
                'UPDATE %s SET %s WHERE ca_id = :ca_id',
                $table,
                implode(', ', $set)
            ),
            $params
        );
        if ($affected <= 0) {
            return [];
        }

        return $this->findCategory($categoryId) ?? [];
    }

    public function deleteCategory(string $categoryId): int
    {
        $table = $this->shopTable('category');
        if (!$this->tableExists($table)) {
            return 0;
        }

        return $this->executeStatement(
            "DELETE FROM {$table} WHERE ca_id = :ca_id",
            ['ca_id' => $categoryId]
        );
    }
}
