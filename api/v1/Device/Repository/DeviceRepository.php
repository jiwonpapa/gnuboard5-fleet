<?php

/**
 * DeviceRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Device\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Device\Repository;

use Api\Support\Repository\BaseRepository;

final class DeviceRepository extends BaseRepository
{
    private static bool $tableReady = false;

    public function register(string $memberId, string $token, string $platform, string $datetime): array
    {
        $this->ensureTable();
        $table = $this->tables()->get('push_device');
        $sql = "INSERT INTO {$table}
                (mb_id, pd_token, pd_platform, pd_active, pd_datetime)
                VALUES (:mb_id, :pd_token, :pd_platform, 1, :pd_datetime)
                ON DUPLICATE KEY UPDATE
                    pd_platform = VALUES(pd_platform),
                    pd_active = 1,
                    pd_datetime = VALUES(pd_datetime)";

        $this->executeStatement($sql, [
            'mb_id' => $memberId,
            'pd_token' => $token,
            'pd_platform' => $platform,
            'pd_datetime' => $datetime,
        ]);

        $row = $this->fetchAssociative(
            "SELECT pd_id, mb_id, pd_token, pd_platform, pd_active, pd_datetime
             FROM {$table}
             WHERE mb_id = :mb_id AND pd_token = :pd_token
             LIMIT 1",
            ['mb_id' => $memberId, 'pd_token' => $token]
        );

        return is_array($row) ? $row : [];
    }

    public function deactivate(string $memberId, string $token, string $datetime): int
    {
        $this->ensureTable();
        $table = $this->tables()->get('push_device');

        return $this->executeStatement(
            "UPDATE {$table}
             SET pd_active = 0, pd_datetime = :pd_datetime
             WHERE mb_id = :mb_id AND pd_token = :pd_token",
            ['mb_id' => $memberId, 'pd_token' => $token, 'pd_datetime' => $datetime]
        );
    }

    private function ensureTable(): void
    {
        if (self::$tableReady) {
            return;
        }

        $table = $this->tables()->get('push_device');
        $this->executeStatement(
            "CREATE TABLE IF NOT EXISTS {$table} (
                pd_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                mb_id VARCHAR(20) NOT NULL,
                pd_token VARCHAR(512) NOT NULL,
                pd_platform VARCHAR(10) NOT NULL,
                pd_active TINYINT(1) NOT NULL DEFAULT 1,
                pd_datetime DATETIME NOT NULL,
                PRIMARY KEY (pd_id),
                UNIQUE KEY uniq_member_token (mb_id, pd_token),
                KEY idx_member_active (mb_id, pd_active),
                KEY idx_token (pd_token(191))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        self::$tableReady = true;
    }
}
