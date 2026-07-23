<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Api\Admin\Sms\Support\LegacyIcodeTransport;
use Api\Admin\Sms\Support\SmsTransport;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Psr\Http\Message\UploadedFileInterface;

class AdminSmsRepository extends AdminSmsRepositoryBase
{
    private ?SmsTransport $resolvedSmsTransport = null;
    private ?AdminSmsConfigStore $resolvedConfigStore = null;
    private ?AdminSmsTemplateStore $resolvedTemplateStore = null;
    private ?AdminSmsContactStore $resolvedContactStore = null;
    private ?AdminSmsMessageStore $resolvedMessageStore = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?SmsTransport $smsTransport = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedSmsTransport = $smsTransport;
    }

    /**
     * @return array<string,mixed>
     */
    public function getConfig(): array
    {
        return $this->configStore()->getConfig();
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateConfig(array $payload): array
    {
        return $this->configStore()->updateConfig($payload);
    }

    /**
     * @return array<string,mixed>
     */
    public function syncMembers(): array
    {
        return $this->contactStore()->syncMembers();
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function listTemplateGroups(): array
    {
        return $this->templateStore()->listTemplateGroups();
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findTemplateGroup(int $groupId): ?array
    {
        return $this->templateStore()->findTemplateGroup($groupId);
    }

    public function templateGroupNameExists(string $name, ?int $excludeId = null): bool
    {
        return $this->templateStore()->templateGroupNameExists($name, $excludeId);
    }

    /**
     * @return array<string,mixed>
     */
    public function createTemplateGroup(string $name, int $memberFlag): array
    {
        return $this->templateStore()->createTemplateGroup($name, $memberFlag);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateTemplateGroup(int $groupId, array $payload): array
    {
        return $this->templateStore()->updateTemplateGroup($groupId, $payload);
    }

    public function moveTemplateGroup(int $groupId, int $targetGroupId): int
    {
        return $this->templateStore()->moveTemplateGroup($groupId, $targetGroupId);
    }

    public function clearTemplateGroup(int $groupId): int
    {
        return $this->templateStore()->clearTemplateGroup($groupId);
    }

    public function deleteTemplateGroup(int $groupId): int
    {
        return $this->templateStore()->deleteTemplateGroup($groupId);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listTemplates(int $page, int $perPage, ?int $groupId, string $searchField, string $search): array
    {
        return $this->templateStore()->listTemplates($page, $perPage, $groupId, $searchField, $search);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findTemplate(int $templateId): ?array
    {
        return $this->templateStore()->findTemplate($templateId);
    }

    public function templateContentExists(string $content, ?int $excludeId = null): bool
    {
        return $this->templateStore()->templateContentExists($content, $excludeId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createTemplate(array $payload): array
    {
        return $this->templateStore()->createTemplate($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateTemplate(int $templateId, array $payload): array
    {
        return $this->templateStore()->updateTemplate($templateId, $payload);
    }

    public function deleteTemplate(int $templateId): int
    {
        return $this->templateStore()->deleteTemplate($templateId);
    }

    /**
     * @param list<int> $templateIds
     * @return array<string,mixed>
     */
    public function batchUpdateTemplates(string $action, array $templateIds, ?int $targetGroupId = null): array
    {
        return $this->templateStore()->batchUpdateTemplates($action, $templateIds, $targetGroupId);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function listContactGroups(): array
    {
        return $this->contactStore()->listContactGroups();
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findContactGroup(int $groupId): ?array
    {
        return $this->contactStore()->findContactGroup($groupId);
    }

    public function contactGroupNameExists(string $name, ?int $excludeId = null): bool
    {
        return $this->contactStore()->contactGroupNameExists($name, $excludeId);
    }

    /**
     * @return array<string,mixed>
     */
    public function createContactGroup(string $name): array
    {
        return $this->contactStore()->createContactGroup($name);
    }

    /**
     * @return array<string,mixed>
     */
    public function updateContactGroup(int $groupId, string $name): array
    {
        return $this->contactStore()->updateContactGroup($groupId, $name);
    }

    public function moveContactGroup(int $groupId, int $targetGroupId): int
    {
        return $this->contactStore()->moveContactGroup($groupId, $targetGroupId);
    }

    public function clearContactGroup(int $groupId): int
    {
        return $this->contactStore()->clearContactGroup($groupId);
    }

    public function deleteContactGroup(int $groupId): int
    {
        return $this->contactStore()->deleteContactGroup($groupId);
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
        return $this->contactStore()->listContacts($page, $perPage, $groupId, $searchField, $search, $withPhoneOnly);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findContact(int $contactId): ?array
    {
        return $this->contactStore()->findContact($contactId);
    }

    public function findContactByPhone(string $phone, ?int $excludeId = null): ?array
    {
        return $this->contactStore()->findContactByPhone($phone, $excludeId);
    }

    public function findMemberByContactId(string $memberId, string $phone, ?string $excludeMemberId = null): ?string
    {
        return $this->contactStore()->findMemberByContactId($memberId, $phone, $excludeMemberId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createContact(array $payload): array
    {
        return $this->contactStore()->createContact($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateContact(int $contactId, array $payload): array
    {
        return $this->contactStore()->updateContact($contactId, $payload);
    }

    public function deleteContact(int $contactId): int
    {
        return $this->contactStore()->deleteContact($contactId);
    }

    /**
     * @param list<int> $contactIds
     * @return array<string,mixed>
     */
    public function batchUpdateContacts(string $action, array $contactIds, ?int $targetGroupId = null): array
    {
        return $this->contactStore()->batchUpdateContacts($action, $contactIds, $targetGroupId);
    }

    /**
     * @param array<int,array<string,mixed>> $contacts
     * @return array<string,mixed>
     */
    public function importContacts(array $contacts, int $groupId, bool $dryRun): array
    {
        return $this->contactStore()->importContacts($contacts, $groupId, $dryRun);
    }

    /**
     * @return array<string,mixed>
     */
    public function importContactsFromUpload(UploadedFileInterface $uploadedFile, int $groupId, bool $dryRun): array
    {
        return $this->contactStore()->importContactsFromUpload($uploadedFile, $groupId, $dryRun);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function exportContacts(?int $groupId, bool $includeNoPhone, bool $withHyphen): array
    {
        return $this->contactStore()->exportContacts($groupId, $includeNoPhone, $withHyphen);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listMessageBatches(int $page, int $perPage, string $search): array
    {
        return $this->messageStore()->listMessageBatches($page, $perPage, $search);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listDeliveries(int $page, int $perPage, string $searchField, string $search): array
    {
        return $this->messageStore()->listDeliveries($page, $perPage, $searchField, $search);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findMessageBatch(int $writeNo, int $writeRenum = 0): ?array
    {
        return $this->messageStore()->findMessageBatch($writeNo, $writeRenum);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listBatchDeliveries(
        int $writeNo,
        int $writeRenum,
        int $page,
        int $perPage,
        string $searchField,
        string $search
    ): array {
        return $this->messageStore()->listBatchDeliveries(
            $writeNo,
            $writeRenum,
            $page,
            $perPage,
            $searchField,
            $search
        );
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function sendMessage(array $payload): array
    {
        return $this->messageStore()->sendMessage($payload, $this->getConfig());
    }

    /**
     * @return array<string,mixed>
     */
    public function resendMessageBatch(int $writeNo, int $sourceRenum, bool $onlyFailures, mixed $bookingAt = null): array
    {
        return $this->messageStore()->resendMessageBatch(
            $writeNo,
            $sourceRenum,
            $onlyFailures,
            $bookingAt,
            $this->getConfig()
        );
    }

    private function smsTransport(): SmsTransport
    {
        if ($this->resolvedSmsTransport instanceof SmsTransport) {
            return $this->resolvedSmsTransport;
        }

        $this->resolvedSmsTransport = new LegacyIcodeTransport();

        return $this->resolvedSmsTransport;
    }

    private function templateStore(): AdminSmsTemplateStore
    {
        if ($this->resolvedTemplateStore instanceof AdminSmsTemplateStore) {
            return $this->resolvedTemplateStore;
        }

        $this->resolvedTemplateStore = new AdminSmsTemplateStore($this->queryBuilder(), $this->tables());

        return $this->resolvedTemplateStore;
    }

    private function configStore(): AdminSmsConfigStore
    {
        if ($this->resolvedConfigStore instanceof AdminSmsConfigStore) {
            return $this->resolvedConfigStore;
        }

        $this->resolvedConfigStore = new AdminSmsConfigStore($this->queryBuilder(), $this->tables());

        return $this->resolvedConfigStore;
    }

    private function contactStore(): AdminSmsContactStore
    {
        if ($this->resolvedContactStore instanceof AdminSmsContactStore) {
            return $this->resolvedContactStore;
        }

        $this->resolvedContactStore = new AdminSmsContactStore($this->queryBuilder(), $this->tables());

        return $this->resolvedContactStore;
    }

    private function messageStore(): AdminSmsMessageStore
    {
        if ($this->resolvedMessageStore instanceof AdminSmsMessageStore) {
            return $this->resolvedMessageStore;
        }

        $this->resolvedMessageStore = new AdminSmsMessageStore(
            $this->queryBuilder(),
            $this->tables(),
            $this->smsTransport()
        );

        return $this->resolvedMessageStore;
    }

}
