<?php

declare(strict_types=1);

namespace Api\Admin\Member\Repository;

final class AdminMemberQueryRepository extends AdminMemberRepositoryBase
{
    private const SORTABLE_FIELDS = [
        'mb_id',
        'mb_level',
        'mb_point',
        'mb_datetime',
    ];

    private const SEARCHABLE_FIELDS = [
        'mb_id',
        'mb_name',
        'mb_nick',
        'mb_email',
    ];

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function list(int $page, int $perPage, ?string $search, ?string $searchField, string $sortBy, string $sortDirection): array
    {
        $where = ' WHERE 1=1 ';
        $params = [];

        $searchTerm = trim((string)$search);
        if ($searchTerm !== '') {
            $where .= ' AND ' . $this->buildSearchClause($searchField, false) . ' ';
            $params['search'] = '%' . $searchTerm . '%';
        }

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$this->memberTable()} {$where}",
            $params
        );
        $total = (int)($countRow['cnt'] ?? 0);

        $offset = ($page - 1) * $perPage;
        $orderField = in_array($sortBy, self::SORTABLE_FIELDS, true) ? $sortBy : 'mb_id';
        $direction = strtoupper($sortDirection) === 'DESC' ? 'DESC' : 'ASC';

        $sql = "SELECT *
        FROM {$this->memberTable()}
        {$where}
        ORDER BY {$orderField} {$direction}
        LIMIT {$perPage} OFFSET {$offset}";

        return [
            'total' => $total,
            'items' => $this->fetchAllAssociative($sql, $params),
        ];
    }

    public function find(string $memberId): ?array
    {
        $row = $this->fetchAssociative(
            "SELECT *
             FROM {$this->memberTable()}
             WHERE mb_id = :mb_id
             LIMIT 1",
            ['mb_id' => $memberId]
        );

        return is_array($row) ? $this->normalizeMemberRow($row) : null;
    }

    public function getMemberImageConfig(): array
    {
        $row = $this->fetchAssociative(
            "SELECT
                cf_use_member_icon,
                cf_member_icon_size,
                cf_member_icon_width,
                cf_member_icon_height,
                cf_member_img_size,
                cf_member_img_width,
                cf_member_img_height
             FROM {$this->configTable()}
             LIMIT 1"
        );

        return [
            'cf_use_member_icon' => (int)($row['cf_use_member_icon'] ?? 0),
            'cf_member_icon_size' => (int)($row['cf_member_icon_size'] ?? 0),
            'cf_member_icon_width' => (int)($row['cf_member_icon_width'] ?? 0),
            'cf_member_icon_height' => (int)($row['cf_member_icon_height'] ?? 0),
            'cf_member_img_size' => (int)($row['cf_member_img_size'] ?? 0),
            'cf_member_img_width' => (int)($row['cf_member_img_width'] ?? 0),
            'cf_member_img_height' => (int)($row['cf_member_img_height'] ?? 0),
        ];
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function exportExcel(?string $search, ?string $searchField): array
    {
        $where = ' WHERE 1=1 ';
        $params = [];
        $searchTerm = trim((string)$search);
        if ($searchTerm !== '') {
            $where .= ' AND ' . $this->buildSearchClause($searchField, true) . ' ';
            $params['search'] = '%' . $searchTerm . '%';
        }

        return $this->fetchAllAssociative(
            "SELECT *
             FROM {$this->memberTable()}
             {$where}
             ORDER BY mb_id ASC",
            $params
        );
    }

    private function buildSearchClause(?string $searchField, bool $includeNameInDefault): string
    {
        $normalizedField = trim((string)$searchField);
        if ($normalizedField === '' || $normalizedField === 'all') {
            $fields = $includeNameInDefault
                ? self::SEARCHABLE_FIELDS
                : ['mb_id', 'mb_nick', 'mb_email'];

            return '(' . implode(' OR ', array_map(
                static fn (string $field): string => sprintf('%s LIKE :search', $field),
                $fields
            )) . ')';
        }

        if (!in_array($normalizedField, self::SEARCHABLE_FIELDS, true)) {
            return '(mb_id LIKE :search OR mb_nick LIKE :search OR mb_email LIKE :search)';
        }

        return sprintf('%s LIKE :search', $normalizedField);
    }
}
