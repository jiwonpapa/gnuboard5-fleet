<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

final class AdminSmsContactGroupQueryStore extends AdminSmsContactStoreBase
{
    /**
     * @return array<int,array<string,mixed>>
     */
    public function listContactGroups(): array
    {
        $this->requireContactStorage('SMS 연락처 그룹 조회');
        $this->ensureDefaultContactGroup();
        $this->syncAllContactGroupStats();

        return $this->fetchAllAssociative(
            "SELECT bg_no, bg_name, bg_count, bg_member, bg_nomember, bg_receipt, bg_reject
             FROM {$this->contactGroupTable()}
             ORDER BY CASE WHEN bg_no = 1 THEN 0 ELSE 1 END ASC, bg_name ASC, bg_no ASC"
        );
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findContactGroup(int $groupId): ?array
    {
        $this->requireContactStorage('SMS 연락처 그룹 조회');
        $this->ensureDefaultContactGroup();

        $row = $this->fetchAssociative(
            "SELECT bg_no, bg_name, bg_count, bg_member, bg_nomember, bg_receipt, bg_reject
             FROM {$this->contactGroupTable()}
             WHERE bg_no = :bg_no
             LIMIT 1",
            ['bg_no' => $groupId]
        );

        return is_array($row) ? $row : null;
    }

    public function contactGroupNameExists(string $name, ?int $excludeId = null): bool
    {
        $this->requireContactStorage('SMS 연락처 그룹 조회');
        $sql = "SELECT bg_no FROM {$this->contactGroupTable()} WHERE bg_name = :bg_name";
        $params = ['bg_name' => $name];
        if ($excludeId !== null) {
            $sql .= " AND bg_no <> :bg_no";
            $params['bg_no'] = $excludeId;
        }

        return is_array($this->fetchAssociative($sql . ' LIMIT 1', $params));
    }
}
