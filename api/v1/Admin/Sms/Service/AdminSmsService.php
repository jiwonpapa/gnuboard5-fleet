<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Service;

use Api\Admin\Sms\Repository\AdminSmsRepository;
use Api\Admin\Sms\Service\Support\AdminSmsInput;
use Api\Support\Exception\ApiException;
use Psr\Http\Message\UploadedFileInterface;

final class AdminSmsService
{
    private ?AdminSmsConfigService $resolvedConfigService = null;
    private ?AdminSmsTemplateService $resolvedTemplateService = null;
    private ?AdminSmsContactService $resolvedContactService = null;
    private ?AdminSmsMessageService $resolvedMessageService = null;

    public function __construct(private readonly AdminSmsRepository $repository)
    {
    }

    /**
     * @return array<string,mixed>
     */
    public function getConfig(): array
    {
        return $this->configService()->getConfig();
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateConfig(array $payload): array
    {
        return $this->configService()->updateConfig($payload);
    }

    /**
     * @return array<string,mixed>
     */
    public function syncMembers(): array
    {
        return $this->configService()->syncMembers();
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,meta:array<string,mixed>}
     */
    public function listTemplateGroups(array $query = []): array
    {
        return $this->templateService()->listTemplateGroups($query);
    }

    /**
     * @return array<string,mixed>
     */
    public function detailTemplateGroup(int $groupId): array
    {
        return $this->templateService()->detailTemplateGroup($groupId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createTemplateGroup(array $payload): array
    {
        return $this->templateService()->createTemplateGroup($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateTemplateGroup(int $groupId, array $payload): array
    {
        return $this->templateService()->updateTemplateGroup($groupId, $payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function moveTemplateGroup(int $groupId, array $payload): array
    {
        return $this->templateService()->moveTemplateGroup($groupId, $payload);
    }

    /**
     * @return array<string,mixed>
     */
    public function clearTemplateGroup(int $groupId): array
    {
        return $this->templateService()->clearTemplateGroup($groupId);
    }

    public function deleteTemplateGroup(int $groupId): void
    {
        $this->templateService()->deleteTemplateGroup($groupId);
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listTemplates(array $query): array
    {
        return $this->templateService()->listTemplates($query);
    }

    /**
     * @return array<string,mixed>
     */
    public function detailTemplate(int $templateId): array
    {
        return $this->templateService()->detailTemplate($templateId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createTemplate(array $payload): array
    {
        return $this->templateService()->createTemplate($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateTemplate(int $templateId, array $payload): array
    {
        return $this->templateService()->updateTemplate($templateId, $payload);
    }

    public function deleteTemplate(int $templateId): void
    {
        $this->templateService()->deleteTemplate($templateId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function batchTemplates(array $payload): array
    {
        return $this->templateService()->batchTemplates($payload);
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,meta:array<string,mixed>}
     */
    public function listContactGroups(array $query = []): array
    {
        return $this->contactService()->listContactGroups($query);
    }

    /**
     * @return array<string,mixed>
     */
    public function detailContactGroup(int $groupId): array
    {
        return $this->contactService()->detailContactGroup($groupId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createContactGroup(array $payload): array
    {
        return $this->contactService()->createContactGroup($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateContactGroup(int $groupId, array $payload): array
    {
        return $this->contactService()->updateContactGroup($groupId, $payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function moveContactGroup(int $groupId, array $payload): array
    {
        return $this->contactService()->moveContactGroup($groupId, $payload);
    }

    /**
     * @return array<string,mixed>
     */
    public function clearContactGroup(int $groupId): array
    {
        return $this->contactService()->clearContactGroup($groupId);
    }

    public function deleteContactGroup(int $groupId): void
    {
        $this->contactService()->deleteContactGroup($groupId);
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>,meta:array<string,mixed>}
     */
    public function listContacts(array $query): array
    {
        return $this->contactService()->listContacts($query);
    }

    /**
     * @return array<string,mixed>
     */
    public function detailContact(int $contactId): array
    {
        return $this->contactService()->detailContact($contactId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createContact(array $payload): array
    {
        return $this->contactService()->createContact($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateContact(int $contactId, array $payload): array
    {
        return $this->contactService()->updateContact($contactId, $payload);
    }

    public function deleteContact(int $contactId): void
    {
        $this->contactService()->deleteContact($contactId);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function batchContacts(array $payload): array
    {
        return $this->contactService()->batchContacts($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function importContacts(array $payload, ?UploadedFileInterface $uploadedFile = null): array
    {
        return $this->contactService()->importContacts($payload, $uploadedFile);
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,meta:array<string,mixed>}
     */
    public function exportContacts(array $query): array
    {
        return $this->contactService()->exportContacts($query);
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listMessageBatches(array $query): array
    {
        return $this->messageService()->listMessageBatches($query);
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listDeliveries(array $query): array
    {
        return $this->messageService()->listDeliveries($query);
    }

    /**
     * @param array<string,mixed> $query
     * @return array<string,mixed>
     */
    public function detailMessageBatch(int $writeNo, array $query): array
    {
        return $this->messageService()->detailMessageBatch($writeNo, $query);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function sendMessage(array $payload): array
    {
        return $this->messageService()->sendMessage($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function resendFailures(int $writeNo, array $payload): array
    {
        return $this->messageService()->resendFailures($writeNo, $payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function resendAll(int $writeNo, array $payload): array
    {
        return $this->messageService()->resendAll($writeNo, $payload);
    }

    private function templateService(): AdminSmsTemplateService
    {
        return $this->resolvedTemplateService ??= new AdminSmsTemplateService($this->repository);
    }

    private function configService(): AdminSmsConfigService
    {
        return $this->resolvedConfigService ??= new AdminSmsConfigService($this->repository);
    }

    private function contactService(): AdminSmsContactService
    {
        return $this->resolvedContactService ??= new AdminSmsContactService($this->repository);
    }

    private function messageService(): AdminSmsMessageService
    {
        return $this->resolvedMessageService ??= new AdminSmsMessageService($this->repository);
    }
}
