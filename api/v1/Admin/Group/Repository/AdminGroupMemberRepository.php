<?php

declare(strict_types=1);

namespace Api\Admin\Group\Repository;

final class AdminGroupMemberRepository extends AdminGroupRepositoryBase
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listMembers(string $groupId, int $page, int $perPage, ?string $search): array
    {
        $where = ' WHERE gm.gr_id = :gr_id ';
        $params = ['gr_id' => $groupId];

        $searchTerm = trim((string)$search);
        if ($searchTerm !== '') {
            $where .= ' AND (m.mb_id LIKE :search OR m.mb_nick LIKE :search OR m.mb_name LIKE :search) ';
            $params['search'] = '%' . $searchTerm . '%';
        }

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$this->groupMemberTable()} gm
             LEFT JOIN {$this->memberTable()} m ON m.mb_id = gm.mb_id
             {$where}",
            $params
        );
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT
                gm.gm_id,
                gm.gr_id,
                gm.mb_id,
                gm.gm_datetime,
                m.mb_name,
                m.mb_nick,
                m.mb_level,
                m.mb_today_login
             FROM {$this->groupMemberTable()} gm
             LEFT JOIN {$this->memberTable()} m ON m.mb_id = gm.mb_id
             {$where}
             ORDER BY gm.gm_id DESC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        );

        return [
            'total' => $total,
            'items' => $items,
        ];
    }

    public function addMember(string $groupId, string $memberId, string $datetime): void
    {
        $this->executeStatement(
            "INSERT INTO {$this->groupMemberTable()} (gr_id, mb_id, gm_datetime)
             VALUES (:gr_id, :mb_id, :gm_datetime)",
            [
                'gr_id' => $groupId,
                'mb_id' => $memberId,
                'gm_datetime' => $datetime,
            ]
        );
    }

    public function removeMember(string $groupId, string $memberId): int
    {
        return $this->executeStatement(
            "DELETE FROM {$this->groupMemberTable()}
             WHERE gr_id = :gr_id
               AND mb_id = :mb_id",
            [
                'gr_id' => $groupId,
                'mb_id' => $memberId,
            ]
        );
    }

    public function existsGroupMember(string $groupId, string $memberId): bool
    {
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$this->groupMemberTable()}
             WHERE gr_id = :gr_id AND mb_id = :mb_id",
            [
                'gr_id' => $groupId,
                'mb_id' => $memberId,
            ]
        );

        return ((int)($row['cnt'] ?? 0)) > 0;
    }

    public function existsMember(string $memberId): bool
    {
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$this->memberTable()}
             WHERE mb_id = :mb_id",
            ['mb_id' => $memberId]
        );

        return ((int)($row['cnt'] ?? 0)) > 0;
    }
}
