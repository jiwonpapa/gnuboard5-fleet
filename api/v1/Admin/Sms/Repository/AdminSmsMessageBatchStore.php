<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

final class AdminSmsMessageBatchStore extends AdminSmsMessageStoreBase
{
    private ?AdminSmsMessageListStore $resolvedListStore = null;
    private ?AdminSmsMessageDetailStore $resolvedDetailStore = null;

    public function __construct(
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null,
        ?AdminSmsMessageListStore $listStore = null,
        ?AdminSmsMessageDetailStore $detailStore = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedListStore = $listStore;
        $this->resolvedDetailStore = $detailStore;
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listMessageBatches(int $page, int $perPage, string $search): array
    {
        return $this->listStore()->listMessageBatches($page, $perPage, $search);
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listDeliveries(int $page, int $perPage, string $searchField, string $search): array
    {
        return $this->listStore()->listDeliveries($page, $perPage, $searchField, $search);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findMessageBatch(int $writeNo, int $writeRenum = 0): ?array
    {
        return $this->detailStore()->findMessageBatch($writeNo, $writeRenum);
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
        return $this->detailStore()->listBatchDeliveries($writeNo, $writeRenum, $page, $perPage, $searchField, $search);
    }

    private function listStore(): AdminSmsMessageListStore
    {
        if ($this->resolvedListStore instanceof AdminSmsMessageListStore) {
            return $this->resolvedListStore;
        }

        $this->resolvedListStore = new AdminSmsMessageListStore($this->queryBuilder(), $this->tables());

        return $this->resolvedListStore;
    }

    private function detailStore(): AdminSmsMessageDetailStore
    {
        if ($this->resolvedDetailStore instanceof AdminSmsMessageDetailStore) {
            return $this->resolvedDetailStore;
        }

        $this->resolvedDetailStore = new AdminSmsMessageDetailStore($this->queryBuilder(), $this->tables());

        return $this->resolvedDetailStore;
    }
}
