<?php

/**
 * AdminPointRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Point\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Point\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;
use Api\Core\DTO\PointDTO;

final class AdminPointRepository extends AdminBaseRepository
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function list(int $page, int $perPage, ?string $memberId, ?string $searchField = null, ?string $search = null): array
    {
        $table = $this->tables()->get('point');
        $where = ' WHERE 1=1 ';
        $params = [];

        $mbId = trim((string)$memberId);
        if ($mbId !== '') {
            $where .= ' AND mb_id = :mb_id ';
            $params['mb_id'] = $mbId;
        } else {
            $searchKeyword = trim((string)$search);
            if ($searchKeyword !== '') {
                $normalizedField = $this->normalizeSearchField($searchField);
                if ($normalizedField === 'po_content') {
                    $where .= ' AND po_content LIKE :search ';
                    $params['search'] = '%' . $searchKeyword . '%';
                } else {
                    $where .= ' AND mb_id LIKE :search ';
                    $params['search'] = '%' . $searchKeyword . '%';
                }
            }
        }

        $countRow = $this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$table} {$where}", $params);
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT
            po_id,
            mb_id,
            po_datetime,
            po_content,
            po_point,
            po_use_point,
            po_expired,
            po_expire_date,
            po_mb_point,
            po_rel_table,
            po_rel_id,
            po_rel_action
        FROM {$table}
        {$where}
        ORDER BY po_id DESC
        LIMIT {$perPage} OFFSET {$offset}";

        return [
            'total' => $total,
            'items' => array_map(
                fn (array $row): array => $this->normalizePointRow($row),
                $this->fetchAllAssociative($sql, $params)
            ),
        ];
    }

    public function findMember(string $memberId): ?array
    {
        $table = $this->tables()->get('member');
        $row = $this->fetchAssociative(
            "SELECT mb_id, mb_point FROM {$table} WHERE mb_id = :mb_id LIMIT 1",
            ['mb_id' => $memberId]
        );

        return is_array($row) ? $row : null;
    }

    public function findPointById(int $poId): ?array
    {
        $table = $this->tables()->get('point');
        $row = $this->fetchAssociative(
            "SELECT po_id, mb_id, po_point, po_rel_table, po_rel_id, po_rel_action
             FROM {$table}
             WHERE po_id = :po_id
             LIMIT 1",
            ['po_id' => max(0, $poId)]
        );

        return is_array($row) ? $row : null;
    }

    private function normalizeSearchField(?string $searchField): string
    {
        return match (trim((string)$searchField)) {
            'po_content' => 'po_content',
            default => 'mb_id',
        };
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function normalizePointRow(array $row): array
    {
        $normalized = PointDTO::fromRow($row)->jsonSerialize();
        $row['po_datetime'] = $normalized['po_datetime'];

        return $row;
    }
}
