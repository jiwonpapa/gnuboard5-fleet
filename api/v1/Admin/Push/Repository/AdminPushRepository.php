<?php

/**
 * AdminPushRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Push\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Push\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminPushRepository extends AdminBaseRepository
{
    /**
     * @param array<int, string> $memberIds
     * @return array{queued: int, failed: int}
     */
    public function queue(string $title, string $body, string $type, array $memberIds, string $datetime): array
    {
        $table = $this->tables()->get('push_log');

        $queued = 0;
        foreach ($memberIds as $memberId) {
            $affected = $this->executeStatement(
                "INSERT INTO {$table}
                    (mb_id, pl_title, pl_body, pl_type, pl_status, pl_datetime)
                 VALUES
                    (:mb_id, :pl_title, :pl_body, :pl_type, 'sent', :pl_datetime)",
                [
                    'mb_id' => $memberId,
                    'pl_title' => $title,
                    'pl_body' => $body,
                    'pl_type' => $type,
                    'pl_datetime' => $datetime,
                ]
            );

            if ($affected > 0) {
                $queued++;
            }
        }

        return [
            'queued' => $queued,
            'failed' => max(0, count($memberIds) - $queued),
        ];
    }

    /**
     * @return array<int, string>
     */
    public function listAllMemberIds(): array
    {
        $memberTable = $this->tables()->get('member');
        $rows = $this->fetchAllAssociative("SELECT mb_id FROM {$memberTable} WHERE mb_id <> ''");

        $memberIds = [];
        foreach ($rows as $row) {
            $memberId = trim((string)($row['mb_id'] ?? ''));
            if ($memberId !== '') {
                $memberIds[] = $memberId;
            }
        }

        return $memberIds;
    }
}
