<?php

declare(strict_types=1);

namespace Api\Admin\Board\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminBoardQueryRepository extends AdminBaseRepository
{
    private const SORTABLE_FIELDS = [
        'bo_table',
        'bo_subject',
        'gr_id',
        'bo_count_write',
        'bo_count_comment',
    ];

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function list(int $page, int $perPage, ?string $groupId, ?string $search, string $sortBy, string $sortDirection): array
    {
        $table = $this->tables()->get('board');
        $where = ' WHERE 1=1 ';
        $params = [];

        $normalizedGroupId = trim((string)$groupId);
        if ($normalizedGroupId !== '') {
            $where .= ' AND gr_id = :gr_id ';
            $params['gr_id'] = $normalizedGroupId;
        }

        $searchTerm = trim((string)$search);
        if ($searchTerm !== '') {
            $where .= ' AND (bo_table LIKE :search OR bo_subject LIKE :search) ';
            $params['search'] = '%' . $searchTerm . '%';
        }

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$table} {$where}",
            $params
        );
        $total = (int)($countRow['cnt'] ?? 0);

        $offset = ($page - 1) * $perPage;
        $orderField = in_array($sortBy, self::SORTABLE_FIELDS, true) ? $sortBy : 'bo_table';
        $direction = strtoupper($sortDirection) === 'DESC' ? 'DESC' : 'ASC';

        $sql = "SELECT *
        FROM {$table}
        {$where}
        ORDER BY {$orderField} {$direction}
        LIMIT {$perPage} OFFSET {$offset}";

        return [
            'total' => $total,
            'items' => $this->fetchAllAssociative($sql, $params),
        ];
    }

    public function find(string $boTable): ?array
    {
        $table = $this->tables()->get('board');
        $row = $this->fetchAssociative(
            "SELECT *
             FROM {$table}
             WHERE bo_table = :bo_table
             LIMIT 1",
            ['bo_table' => $boTable]
        );

        return is_array($row) ? $row : null;
    }
}
