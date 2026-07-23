<?php

declare(strict_types=1);

namespace Api\Notification\Repository;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\CursorPaginationDTO;
use Api\Core\DTO\NotificationLogDTO;
use Api\Support\Pagination\CursorCodec;

final class NotificationLogRepository extends NotificationRepositorySupport
{
    /**
     * @return array{items: array<int, array<string, mixed>>, total: int}
     */
    public function listLogs(string $memberId, int $page, int $perPage): array
    {
        $this->ensurePushLogTable();
        $table = $this->tables()->get('push_log');
        $offset = ($page - 1) * $perPage;
        $safeLimit = max(1, $perPage);
        $safeOffset = max(0, $offset);

        $items = $this->fetchAllAssociative(
            "SELECT pl_id, mb_id, pl_title, pl_body, pl_type, pl_status, pl_datetime
             FROM {$table}
             WHERE mb_id = :mb_id
             ORDER BY pl_id DESC
             LIMIT {$safeLimit} OFFSET {$safeOffset}",
            ['mb_id' => $memberId]
        );

        $count = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$table}
             WHERE mb_id = :mb_id",
            ['mb_id' => $memberId]
        );

        return [
            'items' => array_map(
                static fn (array $row): array => NotificationLogDTO::fromRow($row)->jsonSerialize(),
                $items
            ),
            'total' => (int)($count['cnt'] ?? 0),
        ];
    }

    /**
     * @return CursorPaginatedResult<NotificationLogDTO>
     */
    public function listLogsByCursor(string $memberId, int $perPage, ?string $cursor): CursorPaginatedResult
    {
        $this->ensurePushLogTable();
        $table = $this->tables()->get('push_log');
        $safeLimit = max(1, min(100, $perPage));
        $cursorId = CursorCodec::decode($cursor, 'notification.logs');
        $params = ['mb_id' => $memberId];
        $where = 'mb_id = :mb_id';

        if ($cursorId !== null) {
            $where .= ' AND pl_id < :cursor_id';
            $params['cursor_id'] = $cursorId;
        }

        $rows = $this->fetchAllAssociative(
            "SELECT pl_id, mb_id, pl_title, pl_body, pl_type, pl_status, pl_datetime
             FROM {$table}
             WHERE {$where}
             ORDER BY pl_id DESC
             LIMIT " . ($safeLimit + 1),
            $params
        );

        $hasNext = count($rows) > $safeLimit;
        if ($hasNext) {
            array_pop($rows);
        }

        $items = array_map(
            static fn (array $row): NotificationLogDTO => NotificationLogDTO::fromRow($row),
            $rows
        );
        $lastItem = $items === [] ? null : $items[array_key_last($items)];
        $nextCursor = $lastItem instanceof NotificationLogDTO
            ? CursorCodec::encode('notification.logs', $lastItem->plId)
            : null;

        return new CursorPaginatedResult(
            items: $items,
            pagination: CursorPaginationDTO::create($safeLimit, $cursor, $hasNext ? $nextCursor : null, $hasNext)
        );
    }
}
