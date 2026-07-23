<?php

/**
 * 신고 API 확장 테이블의 초기화를 전담하는 Repository.
 *
 * @package  Api\Report\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Report\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Support\Repository\BaseRepository;
use WeakMap;

final class ReportSchemaRepository extends BaseRepository
{
    /** @var WeakMap<QueryBuilder, bool>|null */
    private static ?WeakMap $readyConnections = null;

    public function ensureTable(): void
    {
        $queryBuilder = $this->queryBuilder();
        $readyConnections = self::readyConnections();

        if (isset($readyConnections[$queryBuilder])) {
            return;
        }

        $table = $this->tables()->get('report');
        $this->executeStatement(
            "CREATE TABLE IF NOT EXISTS {$table} (
                rp_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                mb_id VARCHAR(20) NOT NULL,
                rp_target_type VARCHAR(20) NOT NULL,
                rp_target_id VARCHAR(100) NOT NULL,
                rp_reason VARCHAR(30) NOT NULL,
                rp_detail TEXT NOT NULL,
                rp_status VARCHAR(20) NOT NULL DEFAULT 'pending',
                rp_datetime DATETIME NOT NULL,
                PRIMARY KEY (rp_id),
                UNIQUE KEY uniq_member_target (mb_id, rp_target_type, rp_target_id),
                KEY idx_status_datetime (rp_status, rp_datetime)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        $readyConnections[$queryBuilder] = true;
    }

    /** @return WeakMap<QueryBuilder, bool> */
    private static function readyConnections(): WeakMap
    {
        if (self::$readyConnections === null) {
            /** @var WeakMap<QueryBuilder, bool> $readyConnections */
            $readyConnections = new WeakMap();
            self::$readyConnections = $readyConnections;
        }

        return self::$readyConnections;
    }
}
