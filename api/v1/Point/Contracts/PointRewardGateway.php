<?php

declare(strict_types=1);

namespace Api\Point\Contracts;

interface PointRewardGateway
{
    public function grant(
        string $memberId,
        int $point,
        string $content,
        string $relTable,
        string $relId,
        string $relAction,
        ?int $expireDays = null
    ): void;

    public function revoke(
        string $memberId,
        string $relTable,
        string $relId,
        string $originalAction,
        string $revokeAction,
        string $revokeContent
    ): bool;

    public function exists(string $memberId, string $relTable, string $relId, string $relAction): bool;
}
