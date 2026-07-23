<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Psr\Http\Message\UploadedFileInterface;

final class AdminSmsContactMutationStore extends AdminSmsContactStoreBase
{
    private ?AdminSmsContactQueryStore $resolvedQueryStore = null;
    private ?AdminSmsContactWriteStore $resolvedWriteStore = null;
    private ?AdminSmsContactBatchStore $resolvedBatchStore = null;
    private ?AdminSmsContactImportStore $resolvedImportStore = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?AdminSmsContactQueryStore $queryStore = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedQueryStore = $queryStore;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createContact(array $payload): array
    {
        return $this->writeStore()->createContact($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateContact(int $contactId, array $payload): array
    {
        return $this->writeStore()->updateContact($contactId, $payload);
    }

    public function deleteContact(int $contactId): int
    {
        return $this->writeStore()->deleteContact($contactId);
    }

    /**
     * @param list<int> $contactIds
     * @return array<string,mixed>
     */
    public function batchUpdateContacts(string $action, array $contactIds, ?int $targetGroupId = null): array
    {
        return $this->batchStore()->batchUpdateContacts($action, $contactIds, $targetGroupId);
    }

    /**
     * @param array<int,array<string,mixed>> $contacts
     * @return array<string,mixed>
     */
    public function importContacts(array $contacts, int $groupId, bool $dryRun): array
    {
        return $this->importStore()->importContacts($contacts, $groupId, $dryRun);
    }

    /**
     * @return array<string,mixed>
     */
    public function importContactsFromUpload(UploadedFileInterface $uploadedFile, int $groupId, bool $dryRun): array
    {
        return $this->importStore()->importContactsFromUpload($uploadedFile, $groupId, $dryRun);
    }

    private function queryStore(): AdminSmsContactQueryStore
    {
        return $this->resolvedQueryStore ??= new AdminSmsContactQueryStore($this->queryBuilder(), $this->tables());
    }

    private function writeStore(): AdminSmsContactWriteStore
    {
        return $this->resolvedWriteStore ??= new AdminSmsContactWriteStore(
            $this->queryBuilder(),
            $this->tables(),
            $this->queryStore()
        );
    }

    private function batchStore(): AdminSmsContactBatchStore
    {
        return $this->resolvedBatchStore ??= new AdminSmsContactBatchStore(
            $this->queryBuilder(),
            $this->tables()
        );
    }

    private function importStore(): AdminSmsContactImportStore
    {
        return $this->resolvedImportStore ??= new AdminSmsContactImportStore(
            $this->queryBuilder(),
            $this->tables(),
            $this->queryStore()
        );
    }
}
