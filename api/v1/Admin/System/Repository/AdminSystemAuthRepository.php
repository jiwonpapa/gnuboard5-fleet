<?php

/**
 * AdminSystemAuthRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminSystemAuthRepository extends AdminBaseRepository
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listAuth(int $page, int $perPage, ?string $memberId): array
    {
        $authTable = $this->tables()->get('auth');
        $memberTable = $this->tables()->get('member');
        $where = ' WHERE 1=1 ';
        $params = [];

        $mbId = trim((string)$memberId);
        if ($mbId !== '') {
            $where .= ' AND a.mb_id = :mb_id ';
            $params['mb_id'] = $mbId;
        }

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$authTable} a {$where}",
            $params
        );
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT
                a.mb_id,
                a.au_menu,
                a.au_auth,
                m.mb_name,
                m.mb_nick
             FROM {$authTable} a
             LEFT JOIN {$memberTable} m ON m.mb_id = a.mb_id
             {$where}
             ORDER BY a.mb_id ASC, a.au_menu ASC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        );

        return [
            'total' => $total,
            'items' => $items,
        ];
    }

    public function upsertAuth(string $memberId, string $menu, string $auth): void
    {
        $table = $this->tables()->get('auth');
        $this->executeStatement(
            "INSERT INTO {$table} (mb_id, au_menu, au_auth)
             VALUES (:mb_id, :au_menu, :au_auth)
             ON DUPLICATE KEY UPDATE au_auth = :u_au_auth",
            [
                'mb_id' => $memberId,
                'au_menu' => $menu,
                'au_auth' => $auth,
                'u_au_auth' => $auth,
            ]
        );
    }

    public function deleteAuth(string $memberId, string $menu): int
    {
        $table = $this->tables()->get('auth');

        return $this->executeStatement(
            "DELETE FROM {$table}
             WHERE mb_id = :mb_id AND au_menu = :au_menu",
            [
                'mb_id' => $memberId,
                'au_menu' => $menu,
            ]
        );
    }
}
