<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Service;

use Api\Admin\Sms\Repository\AdminSmsRepository;

final class AdminSmsTemplateService
{
    private ?AdminSmsTemplateGroupService $resolvedGroupService = null;
    private ?AdminSmsTemplateEntryService $resolvedEntryService = null;

    public function __construct(private readonly AdminSmsRepository $repository)
    {
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,meta:array<string,mixed>}
     */
    public function listTemplateGroups(array $query = []): array
    {
        return $this->groupService()->listTemplateGroups($query);
    }

    /**
     * @return array<string,mixed>
     */
    public function detailTemplateGroup(int $groupId): array
    {
        return $this->groupService()->detailTemplateGroup($groupId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createTemplateGroup(array $payload): array
    {
        return $this->groupService()->createTemplateGroup($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateTemplateGroup(int $groupId, array $payload): array
    {
        return $this->groupService()->updateTemplateGroup($groupId, $payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function moveTemplateGroup(int $groupId, array $payload): array
    {
        return $this->groupService()->moveTemplateGroup($groupId, $payload);
    }

    /**
     * @return array<string,mixed>
     */
    public function clearTemplateGroup(int $groupId): array
    {
        return $this->groupService()->clearTemplateGroup($groupId);
    }

    public function deleteTemplateGroup(int $groupId): void
    {
        $this->groupService()->deleteTemplateGroup($groupId);
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listTemplates(array $query): array
    {
        return $this->entryService()->listTemplates($query);
    }

    /**
     * @return array<string,mixed>
     */
    public function detailTemplate(int $templateId): array
    {
        return $this->entryService()->detailTemplate($templateId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createTemplate(array $payload): array
    {
        return $this->entryService()->createTemplate($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateTemplate(int $templateId, array $payload): array
    {
        return $this->entryService()->updateTemplate($templateId, $payload);
    }

    public function deleteTemplate(int $templateId): void
    {
        $this->entryService()->deleteTemplate($templateId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function batchTemplates(array $payload): array
    {
        return $this->entryService()->batchTemplates($payload);
    }

    private function groupService(): AdminSmsTemplateGroupService
    {
        if ($this->resolvedGroupService === null) {
            $this->resolvedGroupService = new AdminSmsTemplateGroupService($this->repository);
        }

        return $this->resolvedGroupService;
    }

    private function entryService(): AdminSmsTemplateEntryService
    {
        if ($this->resolvedEntryService === null) {
            $this->resolvedEntryService = new AdminSmsTemplateEntryService($this->repository);
        }

        return $this->resolvedEntryService;
    }
}
