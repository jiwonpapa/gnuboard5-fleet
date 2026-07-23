<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Api\Admin\Sms\Support\SmsTransport;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class AdminSmsMessageStore extends AdminSmsRepositoryBase
{
    private ?AdminSmsMessageBatchStore $resolvedBatchStore = null;

    private ?AdminSmsMessageDispatchStore $resolvedDispatchStore = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        private readonly ?SmsTransport $smsTransport = null
    ) {
        parent::__construct($qb, $tables);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listMessageBatches(int $page, int $perPage, string $search): array
    {
        return $this->batchStore()->listMessageBatches($page, $perPage, $search);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listDeliveries(int $page, int $perPage, string $searchField, string $search): array
    {
        return $this->batchStore()->listDeliveries($page, $perPage, $searchField, $search);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findMessageBatch(int $writeNo, int $writeRenum = 0): ?array
    {
        return $this->batchStore()->findMessageBatch($writeNo, $writeRenum);
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
        return $this->batchStore()->listBatchDeliveries($writeNo, $writeRenum, $page, $perPage, $searchField, $search);
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $config
     * @return array<string,mixed>
     */
    public function sendMessage(array $payload, array $config): array
    {
        return $this->dispatchStore()->sendMessage($payload, $config);
    }

    /**
     * @param array<string,mixed> $config
     * @return array<string,mixed>
     */
    public function resendMessageBatch(
        int $writeNo,
        int $sourceRenum,
        bool $onlyFailures,
        mixed $bookingAt,
        array $config
    ): array {
        return $this->dispatchStore()->resendMessageBatch($writeNo, $sourceRenum, $onlyFailures, $bookingAt, $config);
    }

    private function batchStore(): AdminSmsMessageBatchStore
    {
        return $this->resolvedBatchStore ??= new AdminSmsMessageBatchStore($this->queryBuilder(), $this->tables());
    }

    private function dispatchStore(): AdminSmsMessageDispatchStore
    {
        return $this->resolvedDispatchStore ??= new AdminSmsMessageDispatchStore(
            $this->queryBuilder(),
            $this->tables(),
            $this->smsTransport
        );
    }
}
