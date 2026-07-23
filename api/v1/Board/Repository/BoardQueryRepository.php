<?php

declare(strict_types=1);

namespace Api\Board\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Repository\BaseRepository;
use Api\Support\Validation\BoTable;

final class BoardQueryRepository extends BaseRepository
{
    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null
    ) {
        parent::__construct($qb, $tables);
    }

    public function findBoard(string $boTable): ?array
    {
        $table = $this->tables()->get('board');
        $groupTable = $this->tables()->get('group');
        $row = $this->fetchAssociative(
            "SELECT b.*, g.gr_admin, g.gr_use_access
             FROM {$table} AS b
             LEFT JOIN {$groupTable} AS g ON g.gr_id = b.gr_id
             WHERE b.bo_table = :bo_table
             LIMIT 1",
            ['bo_table' => BoTable::normalize($boTable)]
        );

        return $row ?: null;
    }

    public function listBoards(?string $groupId, ?int $memberLevel): array
    {
        $boardTable = $this->tables()->get('board');
        $groupTable = $this->tables()->get('group');
        $params = [];

        $where = ' WHERE 1=1 ';
        if ($groupId !== null && $groupId !== '') {
            $where .= ' AND b.gr_id = :gr_id ';
            $params['gr_id'] = trim($groupId);
        }

        if ($memberLevel !== null) {
            $where .= ' AND b.bo_list_level <= :member_level ';
            $params['member_level'] = (int)$memberLevel;
        }

        $sql = <<<SQL
SELECT
    b.bo_table,
    b.bo_subject,
    b.gr_id,
    g.gr_subject,
    b.bo_read_level,
    b.bo_write_level,
    b.bo_comment_level,
    b.bo_use_category,
    b.bo_category_list,
    b.bo_count_write,
    b.bo_count_comment,
    b.bo_use_secret,
    b.bo_use_dhtml_editor,
    b.bo_upload_count,
    b.bo_upload_size
FROM {$boardTable} AS b
LEFT JOIN {$groupTable} AS g
    ON g.gr_id = b.gr_id
{$where}
ORDER BY b.bo_table ASC
SQL;

        $rows = $this->fetchAllAssociative($sql, $params);

        return array_map(fn (array $row): array => $this->toPublicRow($row), $rows);
    }

    public function isGroupMember(string $groupId, string $memberId): bool
    {
        $groupId = trim($groupId);
        $memberId = trim($memberId);
        if ($groupId === '' || $memberId === '') {
            return false;
        }

        $groupMemberTable = $this->tables()->get('group_member');
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$groupMemberTable}
             WHERE gr_id = :gr_id AND mb_id = :mb_id",
            [
                'gr_id' => $groupId,
                'mb_id' => $memberId,
            ]
        );

        return ((int)($row['cnt'] ?? 0)) > 0;
    }

    public function getConfig(): array
    {
        $configTable = $this->tables()->get('config');
        $row = $this->fetchAssociative(
            "SELECT cf_delay_sec FROM {$configTable} LIMIT 1"
        );

        return [
            'cf_delay_sec' => (int)($row['cf_delay_sec'] ?? 0),
        ];
    }

    private function toPublicRow(array $row): array
    {
        return [
            'bo_table' => (string)($row['bo_table'] ?? ''),
            'bo_subject' => (string)($row['bo_subject'] ?? ''),
            'gr_id' => (string)($row['gr_id'] ?? ''),
            'bo_read_level' => (int)($row['bo_read_level'] ?? 0),
            'bo_write_level' => (int)($row['bo_write_level'] ?? 0),
            'bo_comment_level' => (int)($row['bo_comment_level'] ?? 0),
            'bo_use_category' => (int)($row['bo_use_category'] ?? 0),
            'bo_category_list' => (string)($row['bo_category_list'] ?? ''),
            'bo_count_write' => (int)($row['bo_count_write'] ?? 0),
            'bo_count_comment' => (int)($row['bo_count_comment'] ?? 0),
            'bo_use_secret' => (int)($row['bo_use_secret'] ?? 0),
            'bo_use_dhtml_editor' => (int)($row['bo_use_dhtml_editor'] ?? 0),
            'bo_upload_count' => (int)($row['bo_upload_count'] ?? 0),
            'bo_upload_size' => (int)($row['bo_upload_size'] ?? 0),
            'gr_subject' => (string)($row['gr_subject'] ?? ''),
        ];
    }
}
