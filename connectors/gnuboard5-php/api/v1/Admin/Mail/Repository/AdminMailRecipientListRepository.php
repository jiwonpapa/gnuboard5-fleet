<?php

declare(strict_types=1);

namespace Api\Admin\Mail\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminMailRecipientListRepository extends AdminBaseRepository
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listRecipients(
        int $page,
        int $perPage,
        ?string $search,
        ?int $levelMin,
        ?int $levelMax,
        ?string $groupId,
        ?string $memberIdFrom,
        ?string $memberIdTo,
        ?string $emailContains,
        bool $maillingOnly
    ): array {
        $table = $this->tables()->get('member');
        $groupMemberTable = $this->tables()->get('group_member');

        $join = '';
        $where = " WHERE m.mb_leave_date = '' AND m.mb_intercept_date = '' ";
        $params = [];

        $normalizedGroupId = trim((string)$groupId);
        if ($normalizedGroupId !== '') {
            $join .= " INNER JOIN {$groupMemberTable} gm ON gm.mb_id = m.mb_id ";
            $where .= ' AND gm.gr_id = :gr_id ';
            $params['gr_id'] = $normalizedGroupId;
        }

        if ($levelMin !== null) {
            $where .= ' AND m.mb_level >= :level_min ';
            $params['level_min'] = $levelMin;
        }
        if ($levelMax !== null) {
            $where .= ' AND m.mb_level <= :level_max ';
            $params['level_max'] = $levelMax;
        }

        $normalizedMemberIdFrom = trim((string)$memberIdFrom);
        if ($normalizedMemberIdFrom !== '') {
            $where .= ' AND m.mb_id >= :member_id_from ';
            $params['member_id_from'] = $normalizedMemberIdFrom;
        }

        $normalizedMemberIdTo = trim((string)$memberIdTo);
        if ($normalizedMemberIdTo !== '') {
            $where .= ' AND m.mb_id <= :member_id_to ';
            $params['member_id_to'] = $normalizedMemberIdTo;
        }

        $normalizedEmailContains = trim((string)$emailContains);
        if ($normalizedEmailContains !== '') {
            $where .= ' AND m.mb_email LIKE :email_contains ';
            $params['email_contains'] = '%' . $normalizedEmailContains . '%';
        }

        if ($maillingOnly) {
            $where .= " AND m.mb_mailling = '1' ";
        }

        $searchTerm = trim((string)$search);
        if ($searchTerm !== '') {
            $where .= ' AND (m.mb_id LIKE :search OR m.mb_name LIKE :search OR m.mb_nick LIKE :search OR m.mb_email LIKE :search) ';
            $params['search'] = '%' . $searchTerm . '%';
        }

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$table} m
             {$join}
             {$where}",
            $params
        );
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT m.mb_id, m.mb_name, m.mb_nick, m.mb_email, m.mb_level, m.mb_mailling, m.mb_datetime
             FROM {$table} m
             {$join}
             {$where}
             ORDER BY m.mb_id ASC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        );

        return [
            'total' => $total,
            'items' => $items,
        ];
    }
}
