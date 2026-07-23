<?php

declare(strict_types=1);

namespace Api\Memo\Repository;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\CursorPaginationDTO;
use Api\Core\DTO\MemoItemDTO;
use Api\Support\Pagination\CursorCodec;

final class MemoCursorListRepository extends MemoRepositorySupport
{
    /**
     * @return CursorPaginatedResult<MemoItemDTO>
     */
    public function getListByCursor(string $memberId, string $kind, int $perPage, ?string $cursor): CursorPaginatedResult
    {
        [$normalizedKind, $ownerColumn, $counterpartColumn] = $this->resolveKindColumns($kind);

        $memoTable = $this->tables()->get('memo');
        $memberTable = $this->tables()->get('member');
        $perPageSafe = max(1, min(100, $perPage));
        $cursorId = CursorCodec::decode($cursor, 'memo.list.' . $normalizedKind);
        $params = [
            'mb_id' => trim($memberId),
            'kind' => $normalizedKind,
        ];
        $where = "m.{$ownerColumn} = :mb_id AND m.me_type = :kind";

        if ($cursorId !== null) {
            $where .= ' AND m.me_id < :cursor_id';
            $params['cursor_id'] = $cursorId;
        }

        $rows = $this->fetchAllAssociative(
            "SELECT
                m.me_id,
                m.me_recv_mb_id,
                m.me_send_mb_id,
                m.me_send_datetime,
                m.me_read_datetime,
                m.me_memo,
                m.me_send_id,
                m.me_type,
                m.me_send_ip,
                u.mb_id AS counterpart_mb_id,
                u.mb_nick AS counterpart_mb_nick
             FROM {$memoTable} m
             LEFT JOIN {$memberTable} u ON u.mb_id = m.{$counterpartColumn}
             WHERE {$where}
             ORDER BY m.me_id DESC
             LIMIT " . ($perPageSafe + 1),
            $params
        );

        $hasNext = count($rows) > $perPageSafe;
        if ($hasNext) {
            array_pop($rows);
        }

        $items = array_map(
            fn (array $row): MemoItemDTO => MemoItemDTO::fromRow($this->normalizeMemoRow($row)),
            $rows
        );
        $lastItem = $items === [] ? null : $items[array_key_last($items)];
        $nextCursor = $lastItem instanceof MemoItemDTO
            ? CursorCodec::encode('memo.list.' . $normalizedKind, $lastItem->meId)
            : null;

        return new CursorPaginatedResult(
            items: $items,
            pagination: CursorPaginationDTO::create($perPageSafe, $cursor, $hasNext ? $nextCursor : null, $hasNext)
        );
    }
}
