<?php

/**
 * MemoMutationRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Memo\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Memo\Repository;

use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;
use Throwable;

final class MemoMutationRepository extends MemoRepositorySupport
{
    private ?MemoSendStore $resolvedSendStore = null;
    private ?MemoStateStore $resolvedStateStore = null;
    private ?MemoMemberSignalStore $resolvedMemberSignalStore = null;

    public function __construct(
        private readonly MemoQueryRepository $queryRepository,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null,
        ?MemoSendStore $sendStore = null,
        ?MemoStateStore $stateStore = null,
        ?MemoMemberSignalStore $memberSignalStore = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedSendStore = $sendStore;
        $this->resolvedStateStore = $stateStore;
        $this->resolvedMemberSignalStore = $memberSignalStore;
    }

    public function send(string $sendMbId, string $recvMbId, string $memo, string $ip): int
    {
        return $this->sendStore()->send($sendMbId, $recvMbId, $memo, $ip);
    }

    public function markAsRead(int $meId, string $memberId): void
    {
        $this->stateStore()->markAsRead($meId, $memberId);
    }

    public function delete(int $meId, string $memberId): ?array
    {
        return $this->stateStore()->delete($meId, $memberId);
    }

    public function updateMemoCount(string $memberId): void
    {
        $this->memberSignalStore()->updateMemoCount($memberId);
    }

    public function updateMemoCall(string $recvMbId, string $sendMbId): void
    {
        $this->memberSignalStore()->updateMemoCall($recvMbId, $sendMbId);
    }

    public function clearMemoCall(string $recvMbId, string $sendMbId): void
    {
        $this->memberSignalStore()->clearMemoCall($recvMbId, $sendMbId);
    }

    private function sendStore(): MemoSendStore
    {
        if ($this->resolvedSendStore instanceof MemoSendStore) {
            return $this->resolvedSendStore;
        }

        $this->resolvedSendStore = new MemoSendStore($this->queryBuilder(), $this->tables());

        return $this->resolvedSendStore;
    }

    private function stateStore(): MemoStateStore
    {
        if ($this->resolvedStateStore instanceof MemoStateStore) {
            return $this->resolvedStateStore;
        }

        $this->resolvedStateStore = new MemoStateStore($this->queryBuilder(), $this->tables());

        return $this->resolvedStateStore;
    }

    private function memberSignalStore(): MemoMemberSignalStore
    {
        if ($this->resolvedMemberSignalStore instanceof MemoMemberSignalStore) {
            return $this->resolvedMemberSignalStore;
        }

        $this->resolvedMemberSignalStore = new MemoMemberSignalStore(
            $this->queryRepository,
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->resolvedMemberSignalStore;
    }
}
