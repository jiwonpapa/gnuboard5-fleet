<?php

/**
 * MemberLookupRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Member\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Repository;

final class MemberLookupRepository extends MemberRepositorySupport
{
    public function findById(string $memberId): ?array
    {
        $memberTable = $this->getMemberTable();
        $row = $this->fetchAssociative(
            "SELECT *
             FROM {$memberTable}
             WHERE mb_id = :mb_id
             LIMIT 1",
            ['mb_id' => trim($memberId)]
        );

        if ($row === false) {
            return null;
        }

        $isInactive = trim((string)($row['mb_leave_date'] ?? '')) !== ''
            || trim((string)($row['mb_intercept_date'] ?? '')) !== '';
        if ($isInactive) {
            return null;
        }

        return $row;
    }

    public function getMemberImageConfig(): array
    {
        $configTable = $this->tables()->get('config');
        $row = $this->fetchAssociative(
            "SELECT
                cf_use_member_icon,
                cf_member_icon_size,
                cf_member_icon_width,
                cf_member_icon_height,
                cf_member_img_size,
                cf_member_img_width,
                cf_member_img_height
             FROM {$configTable}
             LIMIT 1"
        );

        return [
            'cf_use_member_icon' => (int)($row['cf_use_member_icon'] ?? 0),
            'cf_member_icon_size' => (int)($row['cf_member_icon_size'] ?? 0),
            'cf_member_icon_width' => (int)($row['cf_member_icon_width'] ?? 0),
            'cf_member_icon_height' => (int)($row['cf_member_icon_height'] ?? 0),
            'cf_member_img_size' => (int)($row['cf_member_img_size'] ?? 0),
            'cf_member_img_width' => (int)($row['cf_member_img_width'] ?? 0),
            'cf_member_img_height' => (int)($row['cf_member_img_height'] ?? 0),
        ];
    }
}
