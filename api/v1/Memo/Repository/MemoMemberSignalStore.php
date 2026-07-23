<?php

/**
 * MemoMemberSignalStore API module.
 *
 * @package  Gnuboard5\Api\v1\Memo\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Memo\Repository;

final class MemoMemberSignalStore extends MemoRepositorySupport
{
    public function __construct(
        private readonly MemoQueryRepository $queryRepository,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null
    ) {
        parent::__construct($qb, $tables);
    }

    public function updateMemoCount(string $memberId): void
    {
        $memberTable = $this->tables()->get('member');
        $normalizedId = trim($memberId);
        if ($normalizedId === '') {
            return;
        }

        $count = $this->queryRepository->countUnread($normalizedId);
        $this->executeStatement(
            "UPDATE {$memberTable}
             SET mb_memo_cnt = :mb_memo_cnt
             WHERE mb_id = :mb_id",
            [
                'mb_memo_cnt' => $count,
                'mb_id' => $normalizedId,
            ]
        );
    }

    public function updateMemoCall(string $recvMbId, string $sendMbId): void
    {
        $memberTable = $this->tables()->get('member');
        $recvId = trim($recvMbId);
        $sendId = trim($sendMbId);
        if ($recvId === '' || $sendId === '') {
            return;
        }

        $count = $this->queryRepository->countUnread($recvId);
        $this->executeStatement(
            "UPDATE {$memberTable}
             SET mb_memo_call = :mb_memo_call,
                 mb_memo_cnt = :mb_memo_cnt
             WHERE mb_id = :mb_id",
            [
                'mb_memo_call' => $sendId,
                'mb_memo_cnt' => $count,
                'mb_id' => $recvId,
            ]
        );
    }

    public function clearMemoCall(string $recvMbId, string $sendMbId): void
    {
        $memberTable = $this->tables()->get('member');
        $recvId = trim($recvMbId);
        $sendId = trim($sendMbId);
        if ($recvId === '' || $sendId === '') {
            return;
        }

        $this->executeStatement(
            "UPDATE {$memberTable}
             SET mb_memo_call = ''
             WHERE mb_id = :mb_id
               AND mb_memo_call = :mb_memo_call",
            [
                'mb_id' => $recvId,
                'mb_memo_call' => $sendId,
            ]
        );
    }
}
