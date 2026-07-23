<?php

declare(strict_types=1);

namespace Api\Admin\Poll\Repository;

use Api\Core\Util\G5DateTime;

final class AdminPollQueryRepository extends AdminPollRepositoryBase
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function list(int $page, int $perPage): array
    {
        $countRow = $this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$this->pollTable()}");
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT
                po_id,
                po_subject,
                po_poll1, po_poll2, po_poll3, po_poll4, po_poll5, po_poll6, po_poll7, po_poll8, po_poll9,
                po_cnt1, po_cnt2, po_cnt3, po_cnt4, po_cnt5, po_cnt6, po_cnt7, po_cnt8, po_cnt9,
                po_etc,
                po_date,
                po_level,
                po_point,
                po_use,
                po_ips,
                mb_ids
             FROM {$this->pollTable()}
             ORDER BY po_id DESC
             LIMIT {$perPage} OFFSET {$offset}"
        );

        return [
            'total' => $total,
            'items' => $items,
        ];
    }

    public function find(int $pollId): ?array
    {
        $row = $this->fetchAssociative(
            "SELECT
                po_id, po_subject,
                po_poll1, po_poll2, po_poll3, po_poll4, po_poll5, po_poll6, po_poll7, po_poll8, po_poll9,
                po_cnt1, po_cnt2, po_cnt3, po_cnt4, po_cnt5, po_cnt6, po_cnt7, po_cnt8, po_cnt9,
                po_etc, po_level, po_point, po_date, po_ips, mb_ids, po_use
             FROM {$this->pollTable()}
             WHERE po_id = :po_id
             LIMIT 1",
            ['po_id' => $pollId]
        );

        return is_array($row) ? $row : null;
    }

    public function findActive(): ?array
    {
        $row = $this->fetchAssociative(
            "SELECT
                po_id, po_subject,
                po_poll1, po_poll2, po_poll3, po_poll4, po_poll5, po_poll6, po_poll7, po_poll8, po_poll9,
                po_cnt1, po_cnt2, po_cnt3, po_cnt4, po_cnt5, po_cnt6, po_cnt7, po_cnt8, po_cnt9,
                po_etc, po_level, po_point, po_date, po_ips, mb_ids, po_use
             FROM {$this->pollTable()}
             WHERE po_use = 1
               AND po_date <= :today
             ORDER BY po_id DESC
             LIMIT 1",
            ['today' => G5DateTime::today()]
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function listEtc(int $pollId, int $limit = 100): array
    {
        $safeLimit = max(1, min(1000, $limit));

        return $this->fetchAllAssociative(
            "SELECT pc_id, po_id, mb_id, pc_name, pc_idea, pc_datetime
             FROM {$this->pollEtcTable()}
             WHERE po_id = :po_id
             ORDER BY pc_id DESC
             LIMIT {$safeLimit}",
            ['po_id' => $pollId]
        );
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findMember(string $memberId): ?array
    {
        $row = $this->fetchAssociative(
            "SELECT mb_id, mb_level, mb_nick, mb_name, mb_email, mb_point
             FROM {$this->memberTable()}
             WHERE mb_id = :mb_id
             LIMIT 1",
            ['mb_id' => $memberId]
        );

        return is_array($row) ? $row : null;
    }
}
