<?php

declare(strict_types=1);

namespace Api\Admin\Mail\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminMailRecipientRepository extends AdminBaseRepository
{
    private ?AdminMailRecipientListRepository $listRepository = null;

    private ?AdminMailRecipientSendRepository $sendRepository = null;

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
        return $this->listRepository()->listRecipients(
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
        return $this->sendRepository()->findRecipientsForSend(
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

    private function listRepository(): AdminMailRecipientListRepository
    {
        if ($this->listRepository instanceof AdminMailRecipientListRepository) {
            return $this->listRepository;
        }

        return $this->listRepository = new AdminMailRecipientListRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }

    private function sendRepository(): AdminMailRecipientSendRepository
    {
        if ($this->sendRepository instanceof AdminMailRecipientSendRepository) {
            return $this->sendRepository;
        }

        return $this->sendRepository = new AdminMailRecipientSendRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }
}
