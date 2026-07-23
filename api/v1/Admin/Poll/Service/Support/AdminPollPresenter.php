<?php

declare(strict_types=1);

namespace Api\Admin\Poll\Service\Support;

final class AdminPollPresenter
{
    private const OPTION_FIELDS = [
        'po_poll1', 'po_poll2', 'po_poll3', 'po_poll4', 'po_poll5',
        'po_poll6', 'po_poll7', 'po_poll8', 'po_poll9',
    ];

    private const COUNT_FIELDS = [
        'po_cnt1', 'po_cnt2', 'po_cnt3', 'po_cnt4', 'po_cnt5',
        'po_cnt6', 'po_cnt7', 'po_cnt8', 'po_cnt9',
    ];

    /**
     * @param array<string,mixed> $row
     * @return array<string,int|string>
     */
    public function present(array $row): array
    {
        $poll = [
            'po_id' => (int)($row['po_id'] ?? 0),
            'po_subject' => (string)($row['po_subject'] ?? ''),
        ];

        foreach (self::OPTION_FIELDS as $field) {
            $poll[$field] = (string)($row[$field] ?? '');
        }
        foreach (self::COUNT_FIELDS as $field) {
            $poll[$field] = (int)($row[$field] ?? 0);
        }

        $poll['po_etc'] = (string)($row['po_etc'] ?? '');
        $poll['po_level'] = (int)($row['po_level'] ?? 1);
        $poll['po_point'] = (int)($row['po_point'] ?? 0);
        $poll['po_date'] = (string)($row['po_date'] ?? '');
        $poll['po_ips'] = (string)($row['po_ips'] ?? '');
        $poll['mb_ids'] = (string)($row['mb_ids'] ?? '');
        $poll['po_use'] = (int)($row['po_use'] ?? 0);

        return $poll;
    }
}
