<?php

/**
 * AdminAuthRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Auth\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Auth\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;
use Throwable;

class AdminAuthRepository extends AdminBaseRepository
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function list(
        int $page,
        int $perPage,
        ?string $memberId,
        ?string $dateFrom = null,
        ?string $dateTo = null
    ): array {
        $authTable = $this->tables()->get('auth');
        $memberTable = $this->tables()->get('member');
        $where = ' WHERE 1=1 ';
        $params = [];

        $mbId = trim((string)$memberId);
        if ($mbId !== '') {
            $where .= ' AND a.mb_id = :mb_id ';
            $params['mb_id'] = $mbId;
        }
        if ($dateFrom !== null) {
            $where .= ' AND DATE(m.mb_datetime) >= :date_from ';
            $params['date_from'] = $dateFrom;
        }
        if ($dateTo !== null) {
            $where .= ' AND DATE(m.mb_datetime) <= :date_to ';
            $params['date_to'] = $dateTo;
        }

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(DISTINCT a.mb_id) AS cnt
             FROM {$authTable} a
             LEFT JOIN {$memberTable} m ON m.mb_id = a.mb_id
             {$where}",
            $params
        );
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $memberRows = $this->fetchAllAssociative(
            "SELECT a.mb_id
             FROM {$authTable} a
             LEFT JOIN {$memberTable} m ON m.mb_id = a.mb_id
             {$where}
             GROUP BY a.mb_id
             ORDER BY a.mb_id ASC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        );
        $memberIds = array_values(array_filter(array_map(
            static fn (array $row): string => trim((string)($row['mb_id'] ?? '')),
            $memberRows
        )));
        if ($memberIds === []) {
            return ['total' => $total, 'items' => []];
        }

        $memberParams = [];
        $placeholders = [];
        foreach ($memberIds as $index => $id) {
            $key = 'member_' . $index;
            $placeholders[] = ':' . $key;
            $memberParams[$key] = $id;
        }

        $items = $this->fetchAllAssociative(
            "SELECT a.mb_id, a.au_menu, a.au_auth, m.mb_name, m.mb_nick
             FROM {$authTable} a
             LEFT JOIN {$memberTable} m ON m.mb_id = a.mb_id
             WHERE a.mb_id IN (" . implode(', ', $placeholders) . ")
             ORDER BY a.mb_id ASC, a.au_menu ASC",
            $memberParams
        );

        return [
            'total' => $total,
            'items' => $items,
        ];
    }

    public function memberExists(string $memberId): bool
    {
        $memberTable = $this->tables()->get('member');
        $row = $this->fetchAssociative(
            "SELECT mb_id
             FROM {$memberTable}
             WHERE mb_id = :mb_id
             LIMIT 1",
            ['mb_id' => $memberId]
        );

        return is_array($row);
    }

    /** @return array{mb_id:string,mb_name:mixed,mb_nick:mixed}|null */
    public function findMember(string $memberId): ?array
    {
        $memberTable = $this->tables()->get('member');
        $row = $this->fetchAssociative(
            "SELECT mb_id, mb_name, mb_nick
             FROM {$memberTable}
             WHERE mb_id = :mb_id
             LIMIT 1",
            ['mb_id' => $memberId]
        );

        if (!is_array($row)) {
            return null;
        }

        return [
            'mb_id' => (string)($row['mb_id'] ?? ''),
            'mb_name' => $row['mb_name'] ?? '',
            'mb_nick' => $row['mb_nick'] ?? '',
        ];
    }

    /**
     * @param array<int,array{au_menu:string,au_auth:string}> $authRows
     */
    public function replaceMemberAuth(string $memberId, array $authRows): void
    {
        $table = $this->tables()->get('auth');
        $qb = $this->queryBuilder();

        try {
            $qb->beginTransaction();
            $this->executeStatement(
                "DELETE FROM {$table}
                 WHERE mb_id = :mb_id",
                ['mb_id' => $memberId]
            );

            foreach ($authRows as $row) {
                $this->executeStatement(
                    "INSERT INTO {$table} (mb_id, au_menu, au_auth)
                     VALUES (:mb_id, :au_menu, :au_auth)",
                    [
                        'mb_id' => $memberId,
                        'au_menu' => $row['au_menu'],
                        'au_auth' => $row['au_auth'],
                    ]
                );
            }

            $qb->commit();
        } catch (Throwable $exception) {
            $qb->rollback();
            throw $exception;
        }
    }

    public function deleteByMember(string $memberId): int
    {
        $table = $this->tables()->get('auth');

        return $this->executeStatement(
            "DELETE FROM {$table}
             WHERE mb_id = :mb_id",
            ['mb_id' => $memberId]
        );
    }

    public function countByMember(string $memberId): int
    {
        $table = $this->tables()->get('auth');
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$table}
             WHERE mb_id = :mb_id",
            ['mb_id' => $memberId]
        );

        return (int)($row['cnt'] ?? 0);
    }
}
