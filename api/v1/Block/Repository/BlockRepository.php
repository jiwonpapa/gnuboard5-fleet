<?php

/**
 * BlockRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Block\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Block\Repository;

use Api\Core\DTO\BlockEntryDTO;
use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\CursorPaginationDTO;
use Api\Support\Pagination\CursorCodec;
use Api\Support\Repository\BaseRepository;

final class BlockRepository extends BaseRepository
{
    private static bool $tableReady = false;

    /**
     * @return array{items: array<int, array<string, mixed>>, total: int}
     */
    public function listByMember(string $memberId, int $page, int $perPage): array
    {
        $this->ensureTable();
        $table = $this->tables()->get('user_block');
        $offset = max(0, ($page - 1) * $perPage);
        $limit = max(1, $perPage);

        $items = $this->fetchAllAssociative(
            "SELECT ub_id, mb_id, blocked_mb_id, ub_datetime
             FROM {$table}
             WHERE mb_id = :mb_id
             ORDER BY ub_id DESC
             LIMIT {$limit} OFFSET {$offset}",
            ['mb_id' => $memberId]
        );

        $count = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$table} WHERE mb_id = :mb_id",
            ['mb_id' => $memberId]
        );

        return [
            'items' => array_map(
                static fn (array $row): array => BlockEntryDTO::fromRow($row)->jsonSerialize(),
                $items
            ),
            'total' => (int)($count['cnt'] ?? 0),
        ];
    }

    /**
     * @return CursorPaginatedResult<BlockEntryDTO>
     */
    public function listByMemberCursor(string $memberId, int $perPage, ?string $cursor): CursorPaginatedResult
    {
        $this->ensureTable();
        $table = $this->tables()->get('user_block');
        $safeLimit = max(1, min(100, $perPage));
        $cursorId = CursorCodec::decode($cursor, 'block.list');
        $params = ['mb_id' => $memberId];
        $where = 'mb_id = :mb_id';

        if ($cursorId !== null) {
            $where .= ' AND ub_id < :cursor_id';
            $params['cursor_id'] = $cursorId;
        }

        $rows = $this->fetchAllAssociative(
            "SELECT ub_id, mb_id, blocked_mb_id, ub_datetime
             FROM {$table}
             WHERE {$where}
             ORDER BY ub_id DESC
             LIMIT " . ($safeLimit + 1),
            $params
        );

        $hasNext = count($rows) > $safeLimit;
        if ($hasNext) {
            array_pop($rows);
        }

        $items = array_map(
            static fn (array $row): BlockEntryDTO => BlockEntryDTO::fromRow($row),
            $rows
        );
        $lastItem = $items === [] ? null : $items[array_key_last($items)];
        $nextCursor = $lastItem instanceof BlockEntryDTO ? CursorCodec::encode('block.list', $lastItem->ubId) : null;

        return new CursorPaginatedResult(
            items: $items,
            pagination: CursorPaginationDTO::create($safeLimit, $cursor, $hasNext ? $nextCursor : null, $hasNext)
        );
    }

    public function create(string $memberId, string $blockedMemberId, string $datetime): array
    {
        $this->ensureTable();
        $table = $this->tables()->get('user_block');
        $this->executeStatement(
            "INSERT INTO {$table} (mb_id, blocked_mb_id, ub_datetime)
             VALUES (:mb_id, :blocked_mb_id, :ub_datetime)
             ON DUPLICATE KEY UPDATE ub_datetime = VALUES(ub_datetime)",
            ['mb_id' => $memberId, 'blocked_mb_id' => $blockedMemberId, 'ub_datetime' => $datetime]
        );

        $row = $this->fetchAssociative(
            "SELECT ub_id, mb_id, blocked_mb_id, ub_datetime
             FROM {$table}
             WHERE mb_id = :mb_id AND blocked_mb_id = :blocked_mb_id
             LIMIT 1",
            ['mb_id' => $memberId, 'blocked_mb_id' => $blockedMemberId]
        );

        return is_array($row) ? $row : [];
    }

    public function delete(string $memberId, string $blockedMemberId): int
    {
        $this->ensureTable();
        $table = $this->tables()->get('user_block');

        return $this->executeStatement(
            "DELETE FROM {$table}
             WHERE mb_id = :mb_id AND blocked_mb_id = :blocked_mb_id",
            ['mb_id' => $memberId, 'blocked_mb_id' => $blockedMemberId]
        );
    }

    private function ensureTable(): void
    {
        if (self::$tableReady) {
            return;
        }

        $table = $this->tables()->get('user_block');
        $this->executeStatement(
            "CREATE TABLE IF NOT EXISTS {$table} (
                ub_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                mb_id VARCHAR(20) NOT NULL,
                blocked_mb_id VARCHAR(20) NOT NULL,
                ub_datetime DATETIME NOT NULL,
                PRIMARY KEY (ub_id),
                UNIQUE KEY uniq_member_block (mb_id, blocked_mb_id),
                KEY idx_member (mb_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );

        self::$tableReady = true;
    }
}
