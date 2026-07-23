<?php

/**
 * MemoQueryRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Memo\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Memo\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\MemoItemDTO;

final class MemoQueryRepository extends MemoRepositorySupport
{
    private ?MemoListQueryRepository $resolvedListRepository = null;
    private ?MemoRecipientRepository $resolvedRecipientRepository = null;
    private ?MemoConfigRepository $resolvedConfigRepository = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?MemoListQueryRepository $listRepository = null,
        ?MemoRecipientRepository $recipientRepository = null,
        ?MemoConfigRepository $configRepository = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedListRepository = $listRepository;
        $this->resolvedRecipientRepository = $recipientRepository;
        $this->resolvedConfigRepository = $configRepository;
    }

    public function getList(string $memberId, string $kind, int $page, int $perPage): array
    {
        return $this->listRepository()->getList($memberId, $kind, $page, $perPage);
    }

    /**
     * @return CursorPaginatedResult<MemoItemDTO>
     */
    public function getListByCursor(string $memberId, string $kind, int $perPage, ?string $cursor): CursorPaginatedResult
    {
        return $this->listRepository()->getListByCursor($memberId, $kind, $perPage, $cursor);
    }

    public function getById(int $meId, string $memberId, string $kind): ?array
    {
        return $this->listRepository()->getById($meId, $memberId, $kind);
    }

    public function countUnread(string $memberId): int
    {
        return $this->listRepository()->countUnread($memberId);
    }

    public function validateRecipient(string $recvMbId, bool $isAdmin): array
    {
        return $this->recipientRepository()->validateRecipient($recvMbId, $isAdmin);
    }

    public function getMemoSendPoint(): int
    {
        return $this->configRepository()->getMemoSendPoint();
    }

    private function listRepository(): MemoListQueryRepository
    {
        if ($this->resolvedListRepository instanceof MemoListQueryRepository) {
            return $this->resolvedListRepository;
        }

        $this->resolvedListRepository = new MemoListQueryRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedListRepository;
    }

    private function recipientRepository(): MemoRecipientRepository
    {
        if ($this->resolvedRecipientRepository instanceof MemoRecipientRepository) {
            return $this->resolvedRecipientRepository;
        }

        $this->resolvedRecipientRepository = new MemoRecipientRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedRecipientRepository;
    }

    private function configRepository(): MemoConfigRepository
    {
        if ($this->resolvedConfigRepository instanceof MemoConfigRepository) {
            return $this->resolvedConfigRepository;
        }

        $this->resolvedConfigRepository = new MemoConfigRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedConfigRepository;
    }
}
