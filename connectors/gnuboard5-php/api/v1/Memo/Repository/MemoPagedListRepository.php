<?php

declare(strict_types=1);

namespace Api\Memo\Repository;

final class MemoPagedListRepository extends MemoRepositorySupport
{
    public function getList(string $memberId, string $kind, int $page, int $perPage): array
    {
        [$normalizedKind, $ownerColumn, $counterpartColumn] = $this->resolveKindColumns($kind);

        $memoTable = $this->tables()->get('memo');
        $memberTable = $this->tables()->get('member');
        $pageSafe = max(1, $page);
        $perPageSafe = max(1, min(100, $perPage));
        $offset = ($pageSafe - 1) * $perPageSafe;

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$memoTable}
             WHERE {$ownerColumn} = :mb_id
               AND me_type = :kind",
            [
                'mb_id' => trim($memberId),
                'kind' => $normalizedKind,
            ]
        );
        $total = (int)($countRow['cnt'] ?? 0);

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
             WHERE m.{$ownerColumn} = :mb_id
               AND m.me_type = :kind
             ORDER BY m.me_id DESC
             LIMIT {$perPageSafe} OFFSET {$offset}",
            [
                'mb_id' => trim($memberId),
                'kind' => $normalizedKind,
            ]
        );

        return [
            'items' => array_map(fn (array $row): array => $this->normalizeMemoRow($row), $rows),
            'total' => $total,
            'page' => $pageSafe,
            'per_page' => $perPageSafe,
        ];
    }
}
