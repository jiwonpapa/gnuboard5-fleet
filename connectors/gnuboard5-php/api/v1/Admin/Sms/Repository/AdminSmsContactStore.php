<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Psr\Http\Message\UploadedFileInterface;

final class AdminSmsContactStore extends AdminSmsRepositoryBase
{
    private ?AdminSmsContactGroupStore $resolvedGroupStore = null;
    private ?AdminSmsContactEntryStore $resolvedEntryStore = null;

    /**
     * @return array<string,mixed>
     */
    public function syncMembers(): array
    {
        return $this->groupStore()->syncMembers();
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function listContactGroups(): array
    {
        return $this->groupStore()->listContactGroups();
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findContactGroup(int $groupId): ?array
    {
        return $this->groupStore()->findContactGroup($groupId);
    }

    public function contactGroupNameExists(string $name, ?int $excludeId = null): bool
    {
        return $this->groupStore()->contactGroupNameExists($name, $excludeId);
    }

    /**
     * @return array<string,mixed>
     */
    public function createContactGroup(string $name): array
    {
        return $this->groupStore()->createContactGroup($name);
    }

    /**
     * @return array<string,mixed>
     */
    public function updateContactGroup(int $groupId, string $name): array
    {
        return $this->groupStore()->updateContactGroup($groupId, $name);
    }

    public function moveContactGroup(int $groupId, int $targetGroupId): int
    {
        return $this->groupStore()->moveContactGroup($groupId, $targetGroupId);
    }

    public function clearContactGroup(int $groupId): int
    {
        return $this->groupStore()->clearContactGroup($groupId);
    }

    public function deleteContactGroup(int $groupId): int
    {
        return $this->groupStore()->deleteContactGroup($groupId);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>,summary:array<string,mixed>}
     */
    public function listContacts(
        int $page,
        int $perPage,
        ?int $groupId,
        string $searchField,
        string $search,
        bool $withPhoneOnly
    ): array {
        return $this->entryStore()->listContacts($page, $perPage, $groupId, $searchField, $search, $withPhoneOnly);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findContact(int $contactId): ?array
    {
        return $this->entryStore()->findContact($contactId);
    }

    public function findContactByPhone(string $phone, ?int $excludeId = null): ?array
    {
        return $this->entryStore()->findContactByPhone($phone, $excludeId);
    }

    public function findMemberByContactId(string $memberId, string $phone, ?string $excludeMemberId = null): ?string
    {
        return $this->entryStore()->findMemberByContactId($memberId, $phone, $excludeMemberId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createContact(array $payload): array
    {
        return $this->entryStore()->createContact($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateContact(int $contactId, array $payload): array
    {
        return $this->entryStore()->updateContact($contactId, $payload);
    }

    public function deleteContact(int $contactId): int
    {
        return $this->entryStore()->deleteContact($contactId);
    }

    /**
     * @param list<int> $contactIds
     * @return array<string,mixed>
     */
    public function batchUpdateContacts(string $action, array $contactIds, ?int $targetGroupId = null): array
    {
        return $this->entryStore()->batchUpdateContacts($action, $contactIds, $targetGroupId);
    }

    /**
     * @param array<int,array<string,mixed>> $contacts
     * @return array<string,mixed>
     */
    public function importContacts(array $contacts, int $groupId, bool $dryRun): array
    {
        return $this->entryStore()->importContacts($contacts, $groupId, $dryRun);
    }

    /**
     * @return array<string,mixed>
     */
    public function importContactsFromUpload(UploadedFileInterface $uploadedFile, int $groupId, bool $dryRun): array
    {
        return $this->entryStore()->importContactsFromUpload($uploadedFile, $groupId, $dryRun);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function exportContacts(?int $groupId, bool $includeNoPhone, bool $withHyphen): array
    {
        return $this->entryStore()->exportContacts($groupId, $includeNoPhone, $withHyphen);
    }

    private function groupStore(): AdminSmsContactGroupStore
    {
        return $this->resolvedGroupStore ??= new AdminSmsContactGroupStore($this->queryBuilder(), $this->tables());
    }

    private function entryStore(): AdminSmsContactEntryStore
    {
        return $this->resolvedEntryStore ??= new AdminSmsContactEntryStore($this->queryBuilder(), $this->tables());
    }
}
