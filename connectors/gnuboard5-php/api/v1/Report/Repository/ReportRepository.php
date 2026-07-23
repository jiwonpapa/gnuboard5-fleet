<?php

/**
 * ReportRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Report\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Report\Repository;

use Api\Support\Repository\BaseRepository;

final class ReportRepository extends BaseRepository
{
    private ?ReportSchemaRepository $schemaRepository = null;

    public function findDuplicate(string $memberId, string $targetType, string $targetId): bool
    {
        $this->ensureTable();
        $table = $this->tables()->get('report');
        $row = $this->fetchAssociative(
            "SELECT rp_id FROM {$table}
             WHERE mb_id = :mb_id
               AND rp_target_type = :rp_target_type
               AND rp_target_id = :rp_target_id
             LIMIT 1",
            ['mb_id' => $memberId, 'rp_target_type' => $targetType, 'rp_target_id' => $targetId]
        );

        return is_array($row);
    }

    public function create(
        string $memberId,
        string $targetType,
        string $targetId,
        string $reason,
        string $detail,
        string $datetime
    ): array {
        $this->ensureTable();
        $table = $this->tables()->get('report');
        $this->executeStatement(
            "INSERT INTO {$table}
                (mb_id, rp_target_type, rp_target_id, rp_reason, rp_detail, rp_status, rp_datetime)
             VALUES
                (:mb_id, :rp_target_type, :rp_target_id, :rp_reason, :rp_detail, 'pending', :rp_datetime)",
            [
                'mb_id' => $memberId,
                'rp_target_type' => $targetType,
                'rp_target_id' => $targetId,
                'rp_reason' => $reason,
                'rp_detail' => $detail,
                'rp_datetime' => $datetime,
            ]
        );

        $id = $this->lastInsertId();
        $row = $this->fetchAssociative(
            "SELECT rp_id, mb_id, rp_target_type, rp_target_id, rp_reason, rp_detail, rp_status, rp_datetime
             FROM {$table}
             WHERE rp_id = :rp_id
             LIMIT 1",
            ['rp_id' => $id]
        );

        return is_array($row) ? $row : [];
    }

    private function ensureTable(): void
    {
        $this->schemaRepository()->ensureTable();
    }

    private function schemaRepository(): ReportSchemaRepository
    {
        if ($this->schemaRepository instanceof ReportSchemaRepository) {
            return $this->schemaRepository;
        }

        return $this->schemaRepository = new ReportSchemaRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }
}
