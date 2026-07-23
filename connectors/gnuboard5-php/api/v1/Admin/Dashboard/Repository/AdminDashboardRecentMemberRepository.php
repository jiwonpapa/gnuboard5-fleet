<?php

declare(strict_types=1);

namespace Api\Admin\Dashboard\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminDashboardRecentMemberRepository extends AdminBaseRepository
{
    /**
     * @return list<array<string,mixed>>
     */
    public function recentMembers(int $limit): array
    {
        $memberTable = $this->tables()->get('member');
        $groupMemberTable = $this->tables()->get('group_member');
        $rows = $this->fetchAllAssociative(
            "SELECT
                m.mb_id,
                m.mb_name,
                m.mb_nick,
                m.mb_level,
                m.mb_point,
                m.mb_datetime,
                m.mb_mailling,
                m.mb_open,
                m.mb_email_certify,
                m.mb_intercept_date,
                (
                    SELECT COUNT(*)
                    FROM {$groupMemberTable} gm
                    WHERE gm.mb_id = m.mb_id
                ) AS group_count
             FROM {$memberTable} m
             ORDER BY m.mb_datetime DESC, m.mb_id ASC
             LIMIT {$limit}"
        );

        return array_map(static function (array $row): array {
            return [
                'mb_id' => (string)($row['mb_id'] ?? ''),
                'mb_name' => (string)($row['mb_name'] ?? ''),
                'mb_nick' => (string)($row['mb_nick'] ?? ''),
                'mb_level' => (int)($row['mb_level'] ?? 0),
                'mb_point' => (int)($row['mb_point'] ?? 0),
                'mb_datetime' => (string)($row['mb_datetime'] ?? ''),
                'mb_mailling' => (bool)($row['mb_mailling'] ?? false),
                'mb_open' => (bool)($row['mb_open'] ?? false),
                'email_certified' => preg_match('/[1-9]/', (string)($row['mb_email_certify'] ?? '')) === 1,
                'intercepted' => trim((string)($row['mb_intercept_date'] ?? '')) !== '',
                'group_count' => (int)($row['group_count'] ?? 0),
            ];
        }, $rows);
    }
}
