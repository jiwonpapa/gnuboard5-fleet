<?php

/**
 * AdminSystemMaintenanceRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

class AdminSystemMaintenanceRepository extends AdminBaseRepository
{
    public function countVisitRowsMissingBrowscap(): int
    {
        $table = $this->tables()->get('visit');
        $row = $this->fetchAssociative(
            "SELECT COUNT(vi_id) AS cnt
             FROM {$table}
             WHERE vi_agent <> ''
               AND (vi_browser = '' OR vi_os = '' OR vi_device = '')"
        );

        return (int)($row['cnt'] ?? 0);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listVisitRowsMissingBrowscap(int $limit): array
    {
        $table = $this->tables()->get('visit');
        $resolvedLimit = max(1, $limit);

        return $this->fetchAllAssociative(
            "SELECT vi_id, vi_agent, vi_browser, vi_os, vi_device
             FROM {$table}
             WHERE vi_agent <> ''
               AND (vi_browser = '' OR vi_os = '' OR vi_device = '')
             ORDER BY vi_id DESC
             LIMIT {$resolvedLimit}"
        );
    }

    public function updateVisitBrowscap(int $visitId, string $browser, string $os, string $device): int
    {
        $table = $this->tables()->get('visit');

        return $this->executeStatement(
            "UPDATE {$table}
             SET vi_browser = :vi_browser,
                 vi_os = :vi_os,
                 vi_device = :vi_device
             WHERE vi_id = :vi_id",
            [
                'vi_id' => $visitId,
                'vi_browser' => $browser,
                'vi_os' => $os,
                'vi_device' => $device,
            ]
        );
    }
}
