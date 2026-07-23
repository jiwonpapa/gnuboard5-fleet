<?php

/**
 * PointGrantStore API module.
 *
 * @package  Gnuboard5\Api\v1\Point\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Point\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Database\MySqlNamedLock;

final class PointGrantStore extends PointRepositorySupport
{
    private ?PointGrantMutationStore $resolvedMutationStore = null;

    public function __construct(
        private readonly PointQueryRepository $queryRepository,
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?PointGrantMutationStore $mutationStore = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedMutationStore = $mutationStore;
    }

    public function grant(
        string $memberId,
        int $point,
        string $content,
        string $relTable,
        string $relId,
        string $relAction,
        ?int $expireDays = null
    ): void {
        $normalizedMemberId = trim($memberId);
        if ($normalizedMemberId === '' || $point === 0) {
            return;
        }

        MySqlNamedLock::withLock(
            $this->queryBuilder(),
            $this->memberPointLockName($normalizedMemberId),
            function () use ($normalizedMemberId, $point, $content, $relTable, $relId, $relAction, $expireDays): void {
                $this->mutationStore()->apply(
                    $normalizedMemberId,
                    $point,
                    $content,
                    $relTable,
                    $relId,
                    $relAction,
                    $expireDays
                );
            }
        );
    }

    public function revoke(
        string $memberId,
        string $relTable,
        string $relId,
        string $originalAction,
        string $revokeAction,
        string $revokeContent
    ): bool {
        $normalizedMemberId = trim($memberId);
        if ($normalizedMemberId === '') {
            return false;
        }

        return MySqlNamedLock::withLock(
            $this->queryBuilder(),
            $this->memberPointLockName($normalizedMemberId),
            function () use ($normalizedMemberId, $relTable, $relId, $originalAction, $revokeAction, $revokeContent): bool {
                $pointTable = $this->getPointTable();
                $origin = $this->fetchAssociative(
                    "SELECT po_point
                     FROM {$pointTable}
                     WHERE mb_id = :mb_id
                       AND po_rel_table = :po_rel_table
                       AND po_rel_id = :po_rel_id
                       AND po_rel_action = :po_rel_action
                     ORDER BY po_id DESC
                     LIMIT 1",
                    [
                        'mb_id' => $normalizedMemberId,
                        'po_rel_table' => trim($relTable),
                        'po_rel_id' => trim($relId),
                        'po_rel_action' => trim($originalAction),
                    ]
                );

                if (!is_array($origin) || !array_key_exists('po_point', $origin)) {
                    return false;
                }

                if ($this->queryRepository->exists($normalizedMemberId, trim($relTable), trim($relId), trim($revokeAction))) {
                    return false;
                }

                $delta = -((int)$origin['po_point']);
                if ($delta === 0) {
                    return false;
                }

                $this->mutationStore()->apply(
                    $normalizedMemberId,
                    $delta,
                    $revokeContent,
                    trim($relTable),
                    trim($relId),
                    trim($revokeAction)
                );

                return true;
            }
        );
    }

    private function memberPointLockName(string $memberId): string
    {
        return 'point:member:' . $memberId;
    }

    private function mutationStore(): PointGrantMutationStore
    {
        if ($this->resolvedMutationStore instanceof PointGrantMutationStore) {
            return $this->resolvedMutationStore;
        }

        $this->resolvedMutationStore = new PointGrantMutationStore(
            $this->queryRepository,
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->resolvedMutationStore;
    }
}
