<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Psr\Http\Message\UploadedFileInterface;

final class AdminSmsContactEntryStore extends AdminSmsContactStoreBase
{
    private ?AdminSmsContactQueryStore $resolvedQueryStore = null;

    private ?AdminSmsContactMutationStore $resolvedMutationStore = null;

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
        return $this->queryStore()->listContacts($page, $perPage, $groupId, $searchField, $search, $withPhoneOnly);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findContact(int $contactId): ?array
    {
        return $this->queryStore()->findContact($contactId);
    }

    public function findContactByPhone(string $phone, ?int $excludeId = null): ?array
    {
        return $this->queryStore()->findContactByPhone($phone, $excludeId);
    }

    public function findMemberByContactId(string $memberId, string $phone, ?string $excludeMemberId = null): ?string
    {
        return $this->queryStore()->findMemberByContactId($memberId, $phone, $excludeMemberId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createContact(array $payload): array
    {
        return $this->mutationStore()->createContact($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateContact(int $contactId, array $payload): array
    {
        return $this->mutationStore()->updateContact($contactId, $payload);
    }

    public function deleteContact(int $contactId): int
    {
        return $this->mutationStore()->deleteContact($contactId);
    }

    /**
     * @param list<int> $contactIds
     * @return array<string,mixed>
     */
    public function batchUpdateContacts(string $action, array $contactIds, ?int $targetGroupId = null): array
    {
        return $this->mutationStore()->batchUpdateContacts($action, $contactIds, $targetGroupId);
    }

    /**
     * @param array<int,array<string,mixed>> $contacts
     * @return array<string,mixed>
     */
    public function importContacts(array $contacts, int $groupId, bool $dryRun): array
    {
        return $this->mutationStore()->importContacts($contacts, $groupId, $dryRun);
    }

    /**
     * @return array<string,mixed>
     */
    public function importContactsFromUpload(UploadedFileInterface $uploadedFile, int $groupId, bool $dryRun): array
    {
        return $this->mutationStore()->importContactsFromUpload($uploadedFile, $groupId, $dryRun);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function exportContacts(?int $groupId, bool $includeNoPhone, bool $withHyphen): array
    {
        return $this->queryStore()->exportContacts($groupId, $includeNoPhone, $withHyphen);
    }

    private function queryStore(): AdminSmsContactQueryStore
    {
        return $this->resolvedQueryStore ??= new AdminSmsContactQueryStore($this->queryBuilder(), $this->tables());
    }

    private function mutationStore(): AdminSmsContactMutationStore
    {
        return $this->resolvedMutationStore ??= new AdminSmsContactMutationStore(
            $this->queryBuilder(),
            $this->tables(),
            $this->queryStore()
        );
    }
}
