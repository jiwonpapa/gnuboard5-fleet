<?php

/**
 * PointMutationRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Point\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Point\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class PointMutationRepository
{
    private readonly PointGrantStore $grantStore;
    private readonly PointDeleteStore $deleteStore;

    public function __construct(
        PointQueryRepository $queryRepository,
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null
    ) {
        $this->grantStore = new PointGrantStore($queryRepository, $qb, $tables);
        $this->deleteStore = new PointDeleteStore($qb, $tables);
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
        $this->grantStore->grant($memberId, $point, $content, $relTable, $relId, $relAction, $expireDays);
    }

    public function revoke(
        string $memberId,
        string $relTable,
        string $relId,
        string $originalAction,
        string $revokeAction,
        string $revokeContent
    ): bool {
        return $this->grantStore->revoke(
            $memberId,
            $relTable,
            $relId,
            $originalAction,
            $revokeAction,
            $revokeContent
        );
    }

    public function deleteById(int $poId, string $memberId): void
    {
        $this->deleteStore->deleteById($poId, $memberId);
    }
}
