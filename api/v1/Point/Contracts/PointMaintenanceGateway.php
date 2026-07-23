<?php

declare(strict_types=1);

namespace Api\Point\Contracts;

interface PointMaintenanceGateway
{
    public function syncTotal(string $memberId): void;

    public function deleteById(int $poId, string $memberId): void;

    /**
     * @return array<string, int|string>
     */
    public function expirePoints(?string $today = null): array;
}
