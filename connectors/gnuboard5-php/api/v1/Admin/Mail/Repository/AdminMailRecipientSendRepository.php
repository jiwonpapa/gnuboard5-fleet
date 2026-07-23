<?php

declare(strict_types=1);

namespace Api\Admin\Mail\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminMailRecipientSendRepository extends AdminBaseRepository
{
    /**
     * @param array<int,string> $memberIds
     * @return array<int,array<string,mixed>>
     */
    public function findRecipientsForSend(
        string $targetType,
        array $memberIds,
        ?int $levelMin,
        ?int $levelMax,
        ?string $groupId,
        bool $maillingOnly,
        ?string $memberIdFrom,
        ?string $memberIdTo,
        ?string $emailContains
    ): array {
        $table = $this->tables()->get('member');
        $groupMemberTable = $this->tables()->get('group_member');

        $join = '';
        $where = " WHERE m.mb_leave_date = '' AND m.mb_intercept_date = '' ";
        $params = [];

        if ($maillingOnly) {
            $where .= " AND m.mb_mailling = '1' ";
        }

        if ($targetType === 'member') {
            $normalizedIds = array_values(array_unique(array_filter(array_map(
                static fn ($value): string => trim((string)$value),
                $memberIds
            ))));

            if ($normalizedIds === []) {
                return [];
            }

            $placeholders = [];
            foreach ($normalizedIds as $index => $memberId) {
                $param = 'mb_id_' . $index;
                $placeholders[] = ':' . $param;
                $params[$param] = $memberId;
            }

            $where .= ' AND m.mb_id IN (' . implode(', ', $placeholders) . ') ';
        } else {
            if ($targetType === 'group') {
                $normalizedGroupId = trim((string)$groupId);
                if ($normalizedGroupId === '') {
                    return [];
                }

                $join .= " INNER JOIN {$groupMemberTable} gm ON gm.mb_id = m.mb_id ";
                $where .= ' AND gm.gr_id = :gr_id ';
                $params['gr_id'] = $normalizedGroupId;
            }

            if ($targetType === 'level') {
                if ($levelMin !== null) {
                    $where .= ' AND m.mb_level >= :level_min ';
                    $params['level_min'] = $levelMin;
                }
                if ($levelMax !== null) {
                    $where .= ' AND m.mb_level <= :level_max ';
                    $params['level_max'] = $levelMax;
                }
            }
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

        return $this->fetchAllAssociative(
            "SELECT m.mb_id, m.mb_name, m.mb_nick, m.mb_email, m.mb_level, m.mb_mailling, m.mb_datetime
             FROM {$table} m
             {$join}
             {$where}
             ORDER BY m.mb_id ASC",
            $params
        );
    }
}
