<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class AdminSmsTemplateEntryStore extends AdminSmsTemplateStoreBase
{
    private ?AdminSmsTemplateGroupStore $resolvedGroupStore = null;
    private ?AdminSmsTemplateQueryStore $resolvedQueryStore = null;
    private ?AdminSmsTemplateWriteStore $resolvedWriteStore = null;
    private ?AdminSmsTemplateBatchStore $resolvedBatchStore = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?AdminSmsTemplateGroupStore $groupStore = null,
        ?AdminSmsTemplateQueryStore $queryStore = null,
        ?AdminSmsTemplateWriteStore $writeStore = null,
        ?AdminSmsTemplateBatchStore $batchStore = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedGroupStore = $groupStore;
        $this->resolvedQueryStore = $queryStore;
        $this->resolvedWriteStore = $writeStore;
        $this->resolvedBatchStore = $batchStore;
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listTemplates(int $page, int $perPage, ?int $groupId, string $searchField, string $search): array
    {
        return $this->queryStore()->listTemplates($page, $perPage, $groupId, $searchField, $search);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findTemplate(int $templateId): ?array
    {
        return $this->queryStore()->findTemplate($templateId);
    }

    public function templateContentExists(string $content, ?int $excludeId = null): bool
    {
        return $this->queryStore()->templateContentExists($content, $excludeId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createTemplate(array $payload): array
    {
        return $this->writeStore()->createTemplate($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateTemplate(int $templateId, array $payload): array
    {
        return $this->writeStore()->updateTemplate($templateId, $payload);
    }

    public function deleteTemplate(int $templateId): int
    {
        return $this->writeStore()->deleteTemplate($templateId);
    }

    /**
     * @param list<int> $templateIds
     * @return array<string,mixed>
     */
    public function batchUpdateTemplates(string $action, array $templateIds, ?int $targetGroupId = null): array
    {
        return $this->batchStore()->batchUpdateTemplates($action, $templateIds, $targetGroupId);
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

    private function writeStore(): AdminSmsTemplateWriteStore
    {
        return $this->resolvedWriteStore ??= new AdminSmsTemplateWriteStore(
            $this->queryBuilder(),
            $this->tables(),
            $this->groupStore(),
            $this->queryStore()
        );
    }

    private function batchStore(): AdminSmsTemplateBatchStore
    {
        return $this->resolvedBatchStore ??= new AdminSmsTemplateBatchStore(
            $this->queryBuilder(),
            $this->tables(),
            $this->groupStore()
        );
    }
}
