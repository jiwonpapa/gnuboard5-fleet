<?php

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Repository;

/**
 * Catalog 상품 Repository.
 *
 * @package  Api\Admin\Shop\Catalog\Repository
 * @since    v1.0.0
 */
final class AdminShopCatalogProductRepository extends AdminShopCatalogRepositoryBase
{
    public function listProducts(int $page, int $perPage): array
    {
        $table = $this->shopTable('item');
        if (!$this->tableExists($table)) {
            return ['total' => 0, 'items' => []];
        }

        $count = (int)($this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$table}")['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT * FROM {$table} ORDER BY it_id DESC LIMIT {$perPage} OFFSET {$offset}"
        );

        return [
            'total' => $count,
            'items' => $items,
        ];
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function createProduct(array $payload): array
    {
        $table = $this->shopTable('item');
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

        $productId = (string)($payload[self::PRODUCT_ID] ?? '');
        if ($productId === '') {
            return [];
        }

        return $this->findProduct($productId) ?? [];
    }

    public function findProduct(string $productId): ?array
    {
        $table = $this->shopTable('item');
        if (!$this->tableExists($table)) {
            return null;
        }

        $row = $this->fetchAssociative(
            "SELECT * FROM {$table} WHERE it_id = :it_id LIMIT 1",
            ['it_id' => $productId]
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function updateProduct(string $productId, array $payload): array
    {
        $table = $this->shopTable('item');
        if (!$this->tableExists($table)) {
            return [];
        }

        $payload = $this->filterPayload($table, $payload, [self::PRODUCT_ID]);
        if ($payload === []) {
            return [];
        }

        $set = [];
        $params = ['it_id' => $productId];
        foreach ($payload as $field => $value) {
            $param = 'u_' . $field;
            $set[] = $field . ' = :' . $param;
            $params[$param] = $value;
        }

        $affected = $this->executeStatement(
            sprintf(
                'UPDATE %s SET %s WHERE it_id = :it_id',
                $table,
                implode(', ', $set)
            ),
            $params
        );
        if ($affected <= 0) {
            return [];
        }

        return $this->findProduct($productId) ?? [];
    }

    public function deleteProduct(string $productId): int
    {
        $table = $this->shopTable('item');
        if (!$this->tableExists($table)) {
            return 0;
        }

        return $this->executeStatement(
            "DELETE FROM {$table} WHERE it_id = :it_id",
            ['it_id' => $productId]
        );
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function updateProductStock(string $productId, array $payload): array
    {
        $table = $this->shopTable('item');
        if (!$this->tableExists($table)) {
            return [];
        }

        $payload = $this->filterPayload(
            $table,
            $payload,
            [self::PRODUCT_ID],
            ['it_stock_qty', 'it_noti_qty', 'it_use', 'it_soldout', 'it_stock_sms']
        );
        if ($payload === []) {
            return [];
        }

        $set = [];
        $params = ['it_id' => $productId];
        foreach ($payload as $field => $value) {
            $param = 'u_' . $field;
            $set[] = $field . ' = :' . $param;
            $params[$param] = $value;
        }

        $affected = $this->executeStatement(
            sprintf(
                'UPDATE %s SET %s WHERE it_id = :it_id',
                $table,
                implode(', ', $set)
            ),
            $params
        );
        if ($affected <= 0) {
            return [];
        }

        return $this->findProduct($productId) ?? [];
    }

    public function listProductOptions(string $productId): array
    {
        $table = $this->shopTable('item_option');
        if (!$this->tableExists($table)) {
            return [];
        }

        return $this->fetchAllAssociative(
            "SELECT io_no, io_id, io_type, io_price, io_stock_qty, io_noti_qty, io_use\n             FROM {$table}\n             WHERE it_id = :it_id\n             ORDER BY io_no ASC",
            ['it_id' => $productId]
        );
    }

    public function findProductOption(string $productId, string $optionId): ?array
    {
        $table = $this->shopTable('item_option');
        if (!$this->tableExists($table)) {
            return null;
        }

        $row = $this->fetchAssociative(
            "SELECT io_no, io_id, io_type, it_id, io_price, io_stock_qty, io_noti_qty, io_use\n             FROM {$table}\n             WHERE it_id = :it_id\n               AND io_no = :io_no\n             LIMIT 1",
            [
                self::PRODUCT_ID => $productId,
                self::OPTION_ID => $optionId,
            ]
        );

        return is_array($row) ? $row : null;
    }

    public function updateProductOption(string $productId, string $optionId, array $payload): array
    {
        $table = $this->shopTable('item_option');
        if (!$this->tableExists($table)) {
            return [];
        }

        $payload = $this->filterPayload(
            $table,
            $payload,
            [self::PRODUCT_ID, self::OPTION_ID],
            ['io_stock_qty', 'io_noti_qty', 'io_use']
        );
        if ($payload === []) {
            return [];
        }

        $set = [];
        $params = [self::OPTION_ID => $optionId, self::PRODUCT_ID => $productId];
        foreach ($payload as $field => $value) {
            $param = 'u_' . $field;
            $set[] = $field . ' = :' . $param;
            $params[$param] = $value;
        }

        $affected = $this->executeStatement(
            sprintf(
                'UPDATE %s SET %s WHERE io_no = :io_no AND it_id = :it_id',
                $table,
                implode(', ', $set)
            ),
            $params
        );
        if ($affected <= 0) {
            return [];
        }

        return $this->findProductOption($productId, $optionId) ?? [];
    }

    /**
     * @param list<array<string,mixed>> $payload
     */
    public function updateProductOptions(string $productId, array $payload): array
    {
        $options = [];

        foreach ($payload as $row) {
            if (!is_array($row)) {
                return [];
            }

            $optionId = isset($row[self::OPTION_ID]) ? (string)$row[self::OPTION_ID] : '';
            if ($optionId === '') {
                return [];
            }

            $updated = $this->updateProductOption($productId, $optionId, $row);
            if ($updated === []) {
                return [];
            }

            $options[] = $updated;
        }

        return [
            'product_id' => $productId,
            'items' => $options,
        ];
    }
}
