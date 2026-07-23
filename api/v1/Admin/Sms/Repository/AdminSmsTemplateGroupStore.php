<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

final class AdminSmsTemplateGroupStore extends AdminSmsTemplateStoreBase
{
    /**
     * @return array<int,array<string,mixed>>
     */
    public function listTemplateGroups(): array
    {
        $this->requireTemplateStorage('SMS 템플릿 그룹 조회');
        $table = $this->templateGroupTable();
        $this->syncAllTemplateGroupStats();

        $groups = $this->fetchAllAssociative(
            "SELECT fg_no, fg_name, fg_count, fg_member
             FROM {$table}
             ORDER BY fg_name ASC, fg_no ASC"
        );

        array_unshift($groups, [
            'fg_no' => 0,
            'fg_name' => '미분류',
            'fg_count' => $this->countTemplatesByGroup(0),
            'fg_member' => 0,
            'is_virtual' => true,
        ]);

        return $groups;
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findTemplateGroup(int $groupId): ?array
    {
        $this->requireTemplateStorage('SMS 템플릿 그룹 조회');
        if ($groupId === 0) {
            return [
                'fg_no' => 0,
                'fg_name' => '미분류',
                'fg_count' => $this->countTemplatesByGroup(0),
                'fg_member' => 0,
                'is_virtual' => true,
            ];
        }

        $table = $this->templateGroupTable();
        $row = $this->fetchAssociative(
            "SELECT fg_no, fg_name, fg_count, fg_member
             FROM {$table}
             WHERE fg_no = :fg_no
             LIMIT 1",
            ['fg_no' => $groupId]
        );

        return is_array($row) ? $row : null;
    }

    public function templateGroupNameExists(string $name, ?int $excludeId = null): bool
    {
        $this->requireTemplateStorage('SMS 템플릿 그룹 조회');
        $table = $this->templateGroupTable();
        $sql = "SELECT fg_no FROM {$table} WHERE fg_name = :fg_name";
        $params = ['fg_name' => $name];
        if ($excludeId !== null) {
            $sql .= " AND fg_no <> :fg_no";
            $params['fg_no'] = $excludeId;
        }

        $row = $this->fetchAssociative($sql . ' LIMIT 1', $params);

        return is_array($row);
    }

    /**
     * @return array<string,mixed>
     */
    public function createTemplateGroup(string $name, int $memberFlag): array
    {
        $this->requireTemplateStorage('SMS 템플릿 그룹 생성');
        $table = $this->templateGroupTable();
        $this->executeStatement(
            "INSERT INTO {$table} (fg_name, fg_count, fg_member)
             VALUES (:fg_name, 0, :fg_member)",
            [
                'fg_name' => $name,
                'fg_member' => $memberFlag,
            ]
        );

        return $this->findTemplateGroup($this->lastInsertId()) ?? [];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateTemplateGroup(int $groupId, array $payload): array
    {
        $this->requireTemplateStorage('SMS 템플릿 그룹 수정');
        $table = $this->templateGroupTable();
        $sets = [];
        $params = ['fg_no' => $groupId];

        if (array_key_exists('fg_name', $payload)) {
            $sets[] = 'fg_name = :fg_name';
            $params['fg_name'] = (string)$payload['fg_name'];
        }

        if (array_key_exists('fg_member', $payload)) {
            $sets[] = 'fg_member = :fg_member';
            $params['fg_member'] = (int)$payload['fg_member'];
        }

        if ($sets !== []) {
            $this->executeStatement(
                sprintf('UPDATE %s SET %s WHERE fg_no = :fg_no', $table, implode(', ', $sets)),
                $params
            );
        }

        if (array_key_exists('fg_member', $payload)) {
            $this->executeStatement(
                "UPDATE {$this->templateTable()}
                 SET fg_member = :fg_member
                 WHERE fg_no = :fg_no",
                [
                    'fg_member' => (int)$payload['fg_member'],
                    'fg_no' => $groupId,
                ]
            );
        }

        $this->syncTemplateGroupCount($groupId);

        return $this->findTemplateGroup($groupId) ?? [];
    }

    public function moveTemplateGroup(int $groupId, int $targetGroupId): int
    {
        $this->requireTemplateStorage('SMS 템플릿 그룹 이동');
        $templateTable = $this->templateTable();
        $targetGroup = $this->findTemplateGroup($targetGroupId);
        $fgMember = (int)($targetGroup['fg_member'] ?? 0);

        $affected = $this->executeStatement(
            "UPDATE {$templateTable}
             SET fg_no = :target_fg_no, fg_member = :fg_member
             WHERE fg_no = :fg_no",
            [
                'target_fg_no' => $targetGroupId,
                'fg_member' => $fgMember,
                'fg_no' => $groupId,
            ]
        );

        $this->syncTemplateGroupCount($groupId);
        if ($targetGroupId > 0) {
            $this->syncTemplateGroupCount($targetGroupId);
        }

        return $affected;
    }

    public function clearTemplateGroup(int $groupId): int
    {
        $this->requireTemplateStorage('SMS 템플릿 그룹 비우기');
        $table = $this->templateTable();
        $affected = $this->executeStatement(
            "DELETE FROM {$table} WHERE fg_no = :fg_no",
            ['fg_no' => $groupId]
        );

        if ($groupId > 0) {
            $this->syncTemplateGroupCount($groupId);
        }

        return $affected;
    }

    public function deleteTemplateGroup(int $groupId): int
    {
        $this->requireTemplateStorage('SMS 템플릿 그룹 삭제');
        $this->moveTemplateGroup($groupId, 0);

        return $this->executeStatement(
            "DELETE FROM {$this->templateGroupTable()}
             WHERE fg_no = :fg_no",
            ['fg_no' => $groupId]
        );
    }
}
