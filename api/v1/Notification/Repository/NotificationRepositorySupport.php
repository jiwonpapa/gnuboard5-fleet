<?php

declare(strict_types=1);

namespace Api\Notification\Repository;

use Api\Support\Repository\BaseRepository;

abstract class NotificationRepositorySupport extends BaseRepository
{
    private static bool $pushLogTableReady = false;
    private static bool $pushSettingTableReady = false;

    protected function ensurePushLogTable(): void
    {
        if (self::$pushLogTableReady) {
            return;
        }

        $table = $this->tables()->get('push_log');
        $this->executeStatement(
            "CREATE TABLE IF NOT EXISTS {$table} (
                pl_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                mb_id VARCHAR(20) NOT NULL,
                pl_title VARCHAR(255) NOT NULL DEFAULT '',
                pl_body TEXT NOT NULL,
                pl_type VARCHAR(30) NOT NULL DEFAULT 'notice',
                pl_status VARCHAR(20) NOT NULL DEFAULT 'queued',
                pl_datetime DATETIME NOT NULL,
                PRIMARY KEY (pl_id),
                KEY idx_member_datetime (mb_id, pl_datetime)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        self::$pushLogTableReady = true;
    }

    protected function ensurePushSettingTable(): void
    {
        if (self::$pushSettingTableReady) {
            return;
        }

        $table = $this->tables()->get('push_setting');
        $this->executeStatement(
            "CREATE TABLE IF NOT EXISTS {$table} (
                mb_id VARCHAR(20) NOT NULL,
                ps_receive_comment TINYINT(1) NOT NULL DEFAULT 1,
                ps_receive_message TINYINT(1) NOT NULL DEFAULT 1,
                ps_receive_notice TINYINT(1) NOT NULL DEFAULT 1,
                ps_datetime DATETIME NOT NULL,
                PRIMARY KEY (mb_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        self::$pushSettingTableReady = true;
    }
}
