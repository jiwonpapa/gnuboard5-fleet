<?php

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Repository;

/**
 * Catalog 후기 Repository.
 *
 * @package  Api\Admin\Shop\Catalog\Repository
 * @since    v1.0.0
 */
final class AdminShopCatalogReviewRepository extends AdminShopCatalogRepositoryBase
{
    public function listReviews(int $page, int $perPage): array
    {
        $table = $this->shopTable('item_use');
        if (!$this->tableExists($table)) {
            return [];
        }

        $offset = ($page - 1) * $perPage;

        return $this->fetchAllAssociative(
            "SELECT *\n             FROM {$table}\n             ORDER BY is_id DESC\n             LIMIT {$perPage} OFFSET {$offset}",
            [],
            []
        );
    }

    public function findReview(int $reviewId): ?array
    {
        $table = $this->shopTable('item_use');
        if (!$this->tableExists($table)) {
            return null;
        }

        $row = $this->fetchAssociative(
            "SELECT * FROM {$table} WHERE is_id = :is_id LIMIT 1",
            [self::REVIEW_ID => $reviewId]
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function answerReview(int $reviewId, array $payload): array
    {
        $table = $this->shopTable('item_use');
        if (!$this->tableExists($table)) {
            return [];
        }

        $payload = $this->filterPayload($table, $payload, [self::REVIEW_ID]);
        if ($payload === []) {
            return [];
        }

        $set = [];
        $params = [self::REVIEW_ID => $reviewId];
        foreach ($payload as $field => $value) {
            $param = 'u_' . $field;
            $set[] = $field . ' = :' . $param;
            $params[$param] = $value;
        }

        $affected = $this->executeStatement(
            sprintf(
                'UPDATE %s SET %s WHERE is_id = :is_id',
                $table,
                implode(', ', $set)
            ),
            $params
        );
        if ($affected <= 0) {
            return [];
        }

        return $this->fetchAssociative("SELECT * FROM {$table} WHERE is_id = :is_id LIMIT 1", [self::REVIEW_ID => $reviewId]) ?: [];
    }

    public function countReviews(): int
    {
        $table = $this->shopTable('item_use');
        if (!$this->tableExists($table)) {
            return 0;
        }

        return (int)($this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$table}")['cnt'] ?? 0);
    }
}
