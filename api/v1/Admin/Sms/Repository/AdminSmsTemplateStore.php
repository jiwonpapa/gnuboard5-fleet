<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

final class AdminSmsTemplateStore extends AdminSmsRepositoryBase
{
    private ?AdminSmsTemplateGroupStore $resolvedGroupStore = null;
    private ?AdminSmsTemplateEntryStore $resolvedEntryStore = null;

    /**
     * @return array<int,array<string,mixed>>
     */
    public function listTemplateGroups(): array
    {
        return $this->groupStore()->listTemplateGroups();
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findTemplateGroup(int $groupId): ?array
    {
        return $this->groupStore()->findTemplateGroup($groupId);
    }

    public function templateGroupNameExists(string $name, ?int $excludeId = null): bool
    {
        return $this->groupStore()->templateGroupNameExists($name, $excludeId);
    }

    /**
     * @return array<string,mixed>
     */
    public function createTemplateGroup(string $name, int $memberFlag): array
    {
        return $this->groupStore()->createTemplateGroup($name, $memberFlag);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateTemplateGroup(int $groupId, array $payload): array
    {
        return $this->groupStore()->updateTemplateGroup($groupId, $payload);
    }

    public function moveTemplateGroup(int $groupId, int $targetGroupId): int
    {
        return $this->groupStore()->moveTemplateGroup($groupId, $targetGroupId);
    }

    public function clearTemplateGroup(int $groupId): int
    {
        return $this->groupStore()->clearTemplateGroup($groupId);
    }

    public function deleteTemplateGroup(int $groupId): int
    {
        return $this->groupStore()->deleteTemplateGroup($groupId);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listTemplates(int $page, int $perPage, ?int $groupId, string $searchField, string $search): array
    {
        return $this->entryStore()->listTemplates($page, $perPage, $groupId, $searchField, $search);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findTemplate(int $templateId): ?array
    {
        return $this->entryStore()->findTemplate($templateId);
    }

    public function templateContentExists(string $content, ?int $excludeId = null): bool
    {
        return $this->entryStore()->templateContentExists($content, $excludeId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createTemplate(array $payload): array
    {
        return $this->entryStore()->createTemplate($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateTemplate(int $templateId, array $payload): array
    {
        return $this->entryStore()->updateTemplate($templateId, $payload);
    }

    public function deleteTemplate(int $templateId): int
    {
        return $this->entryStore()->deleteTemplate($templateId);
    }

    /**
     * @param list<int> $templateIds
     * @return array<string,mixed>
     */
    public function batchUpdateTemplates(string $action, array $templateIds, ?int $targetGroupId = null): array
    {
        return $this->entryStore()->batchUpdateTemplates($action, $templateIds, $targetGroupId);
    }

    private function groupStore(): AdminSmsTemplateGroupStore
    {
        return $this->resolvedGroupStore ??= new AdminSmsTemplateGroupStore($this->queryBuilder(), $this->tables());
    }

    private function entryStore(): AdminSmsTemplateEntryStore
    {
        return $this->resolvedEntryStore ??= new AdminSmsTemplateEntryStore($this->queryBuilder(), $this->tables());
    }
}
