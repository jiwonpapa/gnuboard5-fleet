<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class AdminSmsTemplateWriteStore extends AdminSmsTemplateStoreBase
{
    private ?AdminSmsTemplateGroupStore $resolvedGroupStore = null;
    private ?AdminSmsTemplateQueryStore $resolvedQueryStore = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?AdminSmsTemplateGroupStore $groupStore = null,
        ?AdminSmsTemplateQueryStore $queryStore = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedGroupStore = $groupStore;
        $this->resolvedQueryStore = $queryStore;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createTemplate(array $payload): array
    {
        $this->requireTemplateStorage('SMS 템플릿 생성');
        $groupId = (int)($payload['fg_no'] ?? 0);
        $group = $this->groupStore()->findTemplateGroup($groupId);
        $fgMember = (int)($group['fg_member'] ?? 0);

        $this->executeStatement(
            "INSERT INTO {$this->templateTable()}
                (fg_no, fg_member, fo_name, fo_content, fo_datetime)
             VALUES
                (:fg_no, :fg_member, :fo_name, :fo_content, :fo_datetime)",
            [
                'fg_no' => $groupId,
                'fg_member' => $fgMember,
                'fo_name' => (string)$payload['fo_name'],
                'fo_content' => (string)$payload['fo_content'],
                'fo_datetime' => $this->now(),
            ]
        );

        if ($groupId > 0) {
            $this->syncTemplateGroupCount($groupId);
        }

        return $this->queryStore()->findTemplate($this->lastInsertId()) ?? [];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateTemplate(int $templateId, array $payload): array
    {
        $this->requireTemplateStorage('SMS 템플릿 수정');
        $current = $this->queryStore()->findTemplate($templateId) ?? [];
        $groupId = array_key_exists('fg_no', $payload) ? (int)$payload['fg_no'] : (int)($current['fg_no'] ?? 0);
        $group = $this->groupStore()->findTemplateGroup($groupId);
        $fgMember = (int)($group['fg_member'] ?? 0);

        $sets = [
            'fg_no = :fg_no',
            'fg_member = :fg_member',
            'fo_datetime = :fo_datetime',
        ];
        $params = [
            'fo_no' => $templateId,
            'fg_no' => $groupId,
            'fg_member' => $fgMember,
            'fo_datetime' => $this->now(),
        ];

        if (array_key_exists('fo_name', $payload)) {
            $sets[] = 'fo_name = :fo_name';
            $params['fo_name'] = (string)$payload['fo_name'];
        }

        if (array_key_exists('fo_content', $payload)) {
            $sets[] = 'fo_content = :fo_content';
            $params['fo_content'] = (string)$payload['fo_content'];
        }

        $this->executeStatement(
            sprintf('UPDATE %s SET %s WHERE fo_no = :fo_no', $this->templateTable(), implode(', ', $sets)),
            $params
        );

        $previousGroupId = (int)($current['fg_no'] ?? 0);
        if ($previousGroupId > 0) {
            $this->syncTemplateGroupCount($previousGroupId);
        }
        if ($groupId > 0 && $groupId !== $previousGroupId) {
            $this->syncTemplateGroupCount($groupId);
        }

        return $this->queryStore()->findTemplate($templateId) ?? [];
    }

    public function deleteTemplate(int $templateId): int
    {
        $this->requireTemplateStorage('SMS 템플릿 삭제');
        $current = $this->queryStore()->findTemplate($templateId);
        $affected = $this->executeStatement(
            "DELETE FROM {$this->templateTable()} WHERE fo_no = :fo_no",
            ['fo_no' => $templateId]
        );

        $groupId = (int)($current['fg_no'] ?? 0);
        if ($groupId > 0) {
            $this->syncTemplateGroupCount($groupId);
        }

        return $affected;
    }

    private function groupStore(): AdminSmsTemplateGroupStore
    {
        return $this->resolvedGroupStore ??= new AdminSmsTemplateGroupStore($this->queryBuilder(), $this->tables());
    }

    private function queryStore(): AdminSmsTemplateQueryStore
    {
        return $this->resolvedQueryStore ??= new AdminSmsTemplateQueryStore(
            $this->queryBuilder(),
            $this->tables(),
            $this->groupStore()
        );
    }
}
