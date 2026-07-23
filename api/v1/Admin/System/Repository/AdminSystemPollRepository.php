<?php

/**
 * AdminSystemPollRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminSystemPollRepository extends AdminBaseRepository
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listPolls(int $page, int $perPage): array
    {
        $table = $this->tables()->get('poll');
        $countRow = $this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$table}");
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT
                po_id,
                po_subject,
                po_date,
                po_level,
                po_point,
                po_use
             FROM {$table}
             ORDER BY po_id DESC
             LIMIT {$perPage} OFFSET {$offset}"
        );

        return [
            'total' => $total,
            'items' => $items,
        ];
    }

    public function findPoll(int $pollId): ?array
    {
        $table = $this->tables()->get('poll');
        $row = $this->fetchAssociative(
            "SELECT *
             FROM {$table}
             WHERE po_id = :po_id
             LIMIT 1",
            ['po_id' => $pollId]
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function createPoll(array $payload): int
    {
        $table = $this->tables()->get('poll');
        $this->executeStatement(
            "INSERT INTO {$table}
             (po_subject, po_poll1, po_poll2, po_poll3, po_poll4, po_poll5, po_poll6, po_poll7, po_poll8, po_poll9, po_cnt1, po_cnt2, po_cnt3, po_cnt4, po_cnt5, po_cnt6, po_cnt7, po_cnt8, po_cnt9, po_etc, po_level, po_point, po_date, po_ips, mb_ids, po_use)
             VALUES
             (:po_subject, :po_poll1, :po_poll2, :po_poll3, :po_poll4, :po_poll5, :po_poll6, :po_poll7, :po_poll8, :po_poll9, 0, 0, 0, 0, 0, 0, 0, 0, 0, :po_etc, :po_level, :po_point, :po_date, '', '', :po_use)",
            $payload
        );

        return $this->lastInsertId();
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function updatePoll(int $pollId, array $payload): int
    {
        $table = $this->tables()->get('poll');
        $sets = [];
        $params = ['po_id' => $pollId];
        foreach ($payload as $field => $value) {
            $param = 'u_' . $field;
            $sets[] = "{$field} = :{$param}";
            $params[$param] = $value;
        }

        if ($sets === []) {
            return 0;
        }

        return $this->executeStatement(
            "UPDATE {$table}
             SET " . implode(', ', $sets) . "
             WHERE po_id = :po_id",
            $params
        );
    }

    public function deletePoll(int $pollId): int
    {
        $pollTable = $this->tables()->get('poll');
        $pollEtcTable = $this->tables()->get('poll_etc');
        $this->executeStatement(
            "DELETE FROM {$pollEtcTable}
             WHERE po_id = :po_id",
            ['po_id' => $pollId]
        );

        return $this->executeStatement(
            "DELETE FROM {$pollTable}
             WHERE po_id = :po_id",
            ['po_id' => $pollId]
        );
    }
}
