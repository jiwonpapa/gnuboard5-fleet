<?php

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Repository;

final class AdminShopCatalogStockSmsRepository extends AdminShopCatalogRepositoryBase
{
    public function listStockSms(int $page, int $perPage): array
    {
        $table = $this->shopTable('item_stocksms');
        if (!$this->tableExists($table)) {
            return ['total' => 0, 'items' => []];
        }

        $count = (int)($this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$table}")['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        return [
            'total' => $count,
            'items' => $this->fetchAllAssociative(
                "SELECT ss_id, it_id, ss_hp, ss_send, ss_send_time, ss_datetime, ss_ip\n                 FROM {$table}\n                 ORDER BY ss_send ASC, ss_id DESC\n                 LIMIT {$perPage} OFFSET {$offset}"
            ),
        ];
    }

    public function findStockSms(string $stockSmsId): ?array
    {
        $table = $this->shopTable('item_stocksms');
        if (!$this->tableExists($table)) {
            return null;
        }

        $row = $this->fetchAssociative(
            "SELECT ss_id, it_id, ss_hp, ss_send, ss_send_time, ss_datetime, ss_ip\n             FROM {$table}\n             WHERE ss_id = :ss_id LIMIT 1",
            [self::STOCK_SMS_ID => $stockSmsId]
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function updateStockSms(string $stockSmsId, array $payload): array
    {
        $table = $this->shopTable('item_stocksms');
        if (!$this->tableExists($table)) {
            return [];
        }

        $payload = $this->filterPayload(
            $table,
            $payload,
            [self::STOCK_SMS_ID],
            ['ss_hp', 'ss_send']
        );
        if ($payload === []) {
            return [];
        }

        $set = [];
        $params = [self::STOCK_SMS_ID => $stockSmsId];
        foreach ($payload as $field => $value) {
            $param = 'u_' . $field;
            $set[] = $field . ' = :' . $param;
            $params[$param] = $value;
        }

        $affected = $this->executeStatement(
            sprintf(
                'UPDATE %s SET %s WHERE ss_id = :ss_id',
                $table,
                implode(', ', $set)
            ),
            $params
        );
        if ($affected <= 0) {
            return [];
        }

        return $this->findStockSms($stockSmsId) ?? [];
    }

    public function sendStockSms(string $stockSmsId): array
    {
        $table = $this->shopTable('item_stocksms');
        if (!$this->tableExists($table)) {
            return [];
        }

        $affected = $this->executeStatement(
            sprintf(
                "UPDATE %s SET ss_send = 1, ss_send_time = NOW() WHERE ss_id = :ss_id",
                $table
            ),
            [self::STOCK_SMS_ID => $stockSmsId]
        );
        if ($affected <= 0) {
            return [];
        }

        return $this->findStockSms($stockSmsId) ?? [];
    }

    public function deleteStockSms(string $stockSmsId): int
    {
        $table = $this->shopTable('item_stocksms');
        if (!$this->tableExists($table)) {
            return 0;
        }

        return $this->executeStatement(
            sprintf('DELETE FROM %s WHERE ss_id = :ss_id', $table),
            [self::STOCK_SMS_ID => $stockSmsId]
        );
    }
}
