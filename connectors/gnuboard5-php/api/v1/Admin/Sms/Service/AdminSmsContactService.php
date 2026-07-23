<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Service;

use Api\Admin\Sms\Repository\AdminSmsRepository;
use Psr\Http\Message\UploadedFileInterface;

final class AdminSmsContactService
{
    private ?AdminSmsContactGroupService $resolvedGroupService = null;
    private ?AdminSmsContactEntryService $resolvedEntryService = null;

    public function __construct(private readonly AdminSmsRepository $repository)
    {
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,meta:array<string,mixed>}
     */
    public function listContactGroups(array $query = []): array
    {
        return $this->groupService()->listContactGroups($query);
    }

    /**
     * @return array<string,mixed>
     */
    public function detailContactGroup(int $groupId): array
    {
        return $this->groupService()->detailContactGroup($groupId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createContactGroup(array $payload): array
    {
        return $this->groupService()->createContactGroup($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateContactGroup(int $groupId, array $payload): array
    {
        return $this->groupService()->updateContactGroup($groupId, $payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function moveContactGroup(int $groupId, array $payload): array
    {
        return $this->groupService()->moveContactGroup($groupId, $payload);
    }

    /**
     * @return array<string,mixed>
     */
    public function clearContactGroup(int $groupId): array
    {
        return $this->groupService()->clearContactGroup($groupId);
    }

    public function deleteContactGroup(int $groupId): void
    {
        $this->groupService()->deleteContactGroup($groupId);
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>,meta:array<string,mixed>}
     */
    public function listContacts(array $query): array
    {
        return $this->entryService()->listContacts($query);
    }

    /**
     * @return array<string,mixed>
     */
    public function detailContact(int $contactId): array
    {
        return $this->entryService()->detailContact($contactId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createContact(array $payload): array
    {
        return $this->entryService()->createContact($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateContact(int $contactId, array $payload): array
    {
        return $this->entryService()->updateContact($contactId, $payload);
    }

    public function deleteContact(int $contactId): void
    {
        $this->entryService()->deleteContact($contactId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function batchContacts(array $payload): array
    {
        return $this->entryService()->batchContacts($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function importContacts(array $payload, ?UploadedFileInterface $uploadedFile = null): array
    {
        return $this->entryService()->importContacts($payload, $uploadedFile);
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,meta:array<string,mixed>}
     */
    public function exportContacts(array $query): array
    {
        return $this->entryService()->exportContacts($query);
    }

    private function groupService(): AdminSmsContactGroupService
    {
        if ($this->resolvedGroupService === null) {
            $this->resolvedGroupService = new AdminSmsContactGroupService($this->repository);
        }

        return $this->resolvedGroupService;
    }

    private function entryService(): AdminSmsContactEntryService
    {
        if ($this->resolvedEntryService === null) {
            $this->resolvedEntryService = new AdminSmsContactEntryService($this->repository);
        }

        return $this->resolvedEntryService;
    }
}
