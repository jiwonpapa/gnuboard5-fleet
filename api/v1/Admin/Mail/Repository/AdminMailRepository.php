<?php

/**
 * AdminMailRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Mail\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Mail\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

class AdminMailRepository extends AdminBaseRepository
{
    private ?AdminMailTemplateRepository $templateRepository = null;

    private ?AdminMailRecipientRepository $recipientRepository = null;

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listTemplates(int $page, int $perPage): array
    {
        return $this->templateRepository()->listTemplates($page, $perPage);
    }

    public function findTemplate(int $mailId): ?array
    {
        return $this->templateRepository()->findTemplate($mailId);
    }

    public function deleteTemplate(int $mailId): int
    {
        return $this->templateRepository()->deleteTemplate($mailId);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listRecipients(
        int $page,
        int $perPage,
        ?string $search,
        ?int $levelMin,
        ?int $levelMax,
        ?string $groupId,
        ?string $memberIdFrom,
        ?string $memberIdTo,
        ?string $emailContains,
        bool $maillingOnly
    ): array {
        return $this->recipientRepository()->listRecipients(
            $page,
            $perPage,
            $search,
            $levelMin,
            $levelMax,
            $groupId,
            $memberIdFrom,
            $memberIdTo,
            $emailContains,
            $maillingOnly
        );
    }

    /**
     * @param array<int,string> $memberIds
     * @return array<int,array<string,mixed>>
     */
    public function findRecipientsForSend(
        string $targetType,
        array $memberIds,
        ?int $levelMin,
        ?int $levelMax,
        ?string $groupId,
        bool $maillingOnly,
        ?string $memberIdFrom,
        ?string $memberIdTo,
        ?string $emailContains
    ): array {
        return $this->recipientRepository()->findRecipientsForSend(
            $targetType,
            $memberIds,
            $levelMin,
            $levelMax,
            $groupId,
            $maillingOnly,
            $memberIdFrom,
            $memberIdTo,
            $emailContains
        );
    }

    public function createTemplate(string $subject, string $content, string $ipAddress): int
    {
        return $this->templateRepository()->createTemplate($subject, $content, $ipAddress);
    }

    public function updateTemplate(int $mailId, string $subject, string $content, string $ipAddress): int
    {
        return $this->templateRepository()->updateTemplate($mailId, $subject, $content, $ipAddress);
    }

    public function saveLastOption(int $mailId, string $lastOption): int
    {
        return $this->templateRepository()->saveLastOption($mailId, $lastOption);
    }

    private function templateRepository(): AdminMailTemplateRepository
    {
        if ($this->templateRepository instanceof AdminMailTemplateRepository) {
            return $this->templateRepository;
        }

        return $this->templateRepository = new AdminMailTemplateRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }

    private function recipientRepository(): AdminMailRecipientRepository
    {
        if ($this->recipientRepository instanceof AdminMailRecipientRepository) {
            return $this->recipientRepository;
        }

        return $this->recipientRepository = new AdminMailRecipientRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }
}
