<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class AdminSmsContactGroupMutationStore extends AdminSmsContactStoreBase
{
    private ?AdminSmsContactGroupQueryStore $resolvedQueryStore = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?AdminSmsContactGroupQueryStore $queryStore = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedQueryStore = $queryStore;
    }

    /**
     * @return array<string,mixed>
     */
    public function createContactGroup(string $name): array
    {
        $this->requireContactStorage('SMS 연락처 그룹 생성');
        $this->executeStatement(
            "INSERT INTO {$this->contactGroupTable()}
                (bg_name, bg_count, bg_member, bg_nomember, bg_receipt, bg_reject)
             VALUES
                (:bg_name, 0, 0, 0, 0, 0)",
            ['bg_name' => $name]
        );

        return $this->queryStore()->findContactGroup($this->lastInsertId()) ?? [];
    }

    /**
     * @return array<string,mixed>
     */
    public function updateContactGroup(int $groupId, string $name): array
    {
        $this->requireContactStorage('SMS 연락처 그룹 수정');
        $this->executeStatement(
            "UPDATE {$this->contactGroupTable()}
             SET bg_name = :bg_name
             WHERE bg_no = :bg_no",
            [
                'bg_no' => $groupId,
                'bg_name' => $name,
            ]
        );

        return $this->queryStore()->findContactGroup($groupId) ?? [];
    }

    public function moveContactGroup(int $groupId, int $targetGroupId): int
    {
        $this->requireContactStorage('SMS 연락처 그룹 이동');
        $affected = $this->executeStatement(
            "UPDATE {$this->contactTable()}
             SET bg_no = :target_bg_no
             WHERE bg_no = :bg_no",
            [
                'target_bg_no' => $targetGroupId,
                'bg_no' => $groupId,
            ]
        );

        $this->syncAllContactGroupStats();

        return $affected;
    }

    public function clearContactGroup(int $groupId): int
    {
        $this->requireContactStorage('SMS 연락처 그룹 비우기');
        $affected = $this->executeStatement(
            "DELETE FROM {$this->contactTable()} WHERE bg_no = :bg_no",
            ['bg_no' => $groupId]
        );
        $this->syncAllContactGroupStats();

        return $affected;
    }

    public function deleteContactGroup(int $groupId): int
    {
        $this->requireContactStorage('SMS 연락처 그룹 삭제');
        $this->moveContactGroup($groupId, 1);

        return $this->executeStatement(
            "DELETE FROM {$this->contactGroupTable()} WHERE bg_no = :bg_no",
            ['bg_no' => $groupId]
        );
    }

    private function queryStore(): AdminSmsContactGroupQueryStore
    {
        return $this->resolvedQueryStore ??= new AdminSmsContactGroupQueryStore($this->queryBuilder(), $this->tables());
    }
}
