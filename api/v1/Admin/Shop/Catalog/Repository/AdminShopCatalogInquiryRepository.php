<?php

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Repository;

/**
 * Catalog 문의 Repository.
 *
 * @package  Api\Admin\Shop\Catalog\Repository
 * @since    v1.0.0
 */
final class AdminShopCatalogInquiryRepository extends AdminShopCatalogRepositoryBase
{
    public function listInquiries(int $page, int $perPage): array
    {
        $table = $this->shopTable('item_qa');
        if (!$this->tableExists($table)) {
            return [];
        }

        $offset = ($page - 1) * $perPage;

        return $this->fetchAllAssociative(
            "SELECT *\n             FROM {$table}\n             ORDER BY iq_id DESC\n             LIMIT {$perPage} OFFSET {$offset}",
            [],
            []
        );
    }

    public function findInquiry(int $inquiryId): ?array
    {
        $table = $this->shopTable('item_qa');
        if (!$this->tableExists($table)) {
            return null;
        }

        $row = $this->fetchAssociative(
            "SELECT * FROM {$table} WHERE iq_id = :iq_id LIMIT 1",
            [self::INQUIRY_ID => $inquiryId]
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function answerInquiry(int $inquiryId, array $payload): array
    {
        $table = $this->shopTable('item_qa');
        if (!$this->tableExists($table)) {
            return [];
        }

        $payload = $this->filterPayload($table, $payload, [self::INQUIRY_ID]);
        if ($payload === []) {
            return [];
        }

        $set = [];
        $params = [self::INQUIRY_ID => $inquiryId];
        foreach ($payload as $field => $value) {
            $param = 'u_' . $field;
            $set[] = $field . ' = :' . $param;
            $params[$param] = $value;
        }

        $affected = $this->executeStatement(
            sprintf(
                'UPDATE %s SET %s WHERE iq_id = :iq_id',
                $table,
                implode(', ', $set)
            ),
            $params
        );
        if ($affected <= 0) {
            return [];
        }

        return $this->fetchAssociative("SELECT * FROM {$table} WHERE iq_id = :iq_id LIMIT 1", [self::INQUIRY_ID => $inquiryId]) ?: [];
    }

    public function countInquiries(): int
    {
        $table = $this->shopTable('item_qa');
        if (!$this->tableExists($table)) {
            return 0;
        }

        return (int)($this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$table}")['cnt'] ?? 0);
    }
}
