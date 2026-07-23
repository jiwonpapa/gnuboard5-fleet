<?php

declare(strict_types=1);

namespace Api\Point\Repository;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\CursorPaginationDTO;
use Api\Core\DTO\PaginatedResult;
use Api\Core\DTO\PaginationDTO;
use Api\Core\DTO\PointDTO;
use Api\Support\Pagination\CursorCodec;

final class PointHistoryQueryRepository extends PointRepositorySupport
{
    /**
     * @return PaginatedResult<PointDTO>
     */
    public function getPointHistory(string $memberId, int $page, int $perPage): PaginatedResult
    {
        $pointTable = $this->getPointTable();
        $pageSafe = max(1, $page);
        $perPageSafe = max(1, min(100, $perPage));
        $offset = ($pageSafe - 1) * $perPageSafe;

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$pointTable} WHERE mb_id = :mb_id",
            ['mb_id' => $memberId]
        );
        $total = (int)($countRow['cnt'] ?? 0);

        $rows = $this->fetchAllAssociative(
            "SELECT
                po_id,
                mb_id,
                po_point,
                po_datetime,
                po_content,
                po_use_point,
                po_expired,
                po_expire_date,
                po_mb_point,
                po_rel_table,
                po_rel_id,
                po_rel_action
             FROM {$pointTable}
             WHERE mb_id = :mb_id
             ORDER BY po_id DESC
             LIMIT {$perPageSafe} OFFSET {$offset}",
            ['mb_id' => $memberId]
        );

        $items = array_map(
            static fn (array $row): PointDTO => PointDTO::fromRow($row),
            $rows
        );

        return new PaginatedResult(
            items: $items,
            pagination: PaginationDTO::create($total, $pageSafe, $perPageSafe)
        );
    }

    /**
     * @return CursorPaginatedResult<PointDTO>
     */
    public function getPointHistoryByCursor(string $memberId, int $perPage, ?string $cursor): CursorPaginatedResult
    {
        $pointTable = $this->getPointTable();
        $perPageSafe = max(1, min(100, $perPage));
        $cursorId = CursorCodec::decode($cursor, 'point.history');
        $params = ['mb_id' => $memberId];
        $where = 'mb_id = :mb_id';

        if ($cursorId !== null) {
            $where .= ' AND po_id < :cursor_id';
            $params['cursor_id'] = $cursorId;
        }

        $rows = $this->fetchAllAssociative(
            "SELECT
                po_id,
                mb_id,
                po_point,
                po_datetime,
                po_content,
                po_use_point,
                po_expired,
                po_expire_date,
                po_mb_point,
                po_rel_table,
                po_rel_id,
                po_rel_action
             FROM {$pointTable}
             WHERE {$where}
             ORDER BY po_id DESC
             LIMIT " . ($perPageSafe + 1),
            $params
        );

        $hasNext = count($rows) > $perPageSafe;
        if ($hasNext) {
            array_pop($rows);
        }

        $items = array_map(
            static fn (array $row): PointDTO => PointDTO::fromRow($row),
            $rows
        );
        $lastItem = $items === [] ? null : $items[array_key_last($items)];
        $nextCursor = $lastItem instanceof PointDTO ? CursorCodec::encode('point.history', $lastItem->poId) : null;

        return new CursorPaginatedResult(
            items: $items,
            pagination: CursorPaginationDTO::create($perPageSafe, $cursor, $hasNext ? $nextCursor : null, $hasNext)
        );
    }
}
