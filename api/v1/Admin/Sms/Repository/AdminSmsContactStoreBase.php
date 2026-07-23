<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

abstract class AdminSmsContactStoreBase extends AdminSmsRepositoryBase
{
    protected function ensureDefaultContactGroup(): void
    {
        $table = $this->contactGroupTable();
        $row = $this->fetchAssociative(
            "SELECT bg_no FROM {$table} WHERE bg_no = 1 LIMIT 1"
        );
        if (!is_array($row)) {
            $this->executeStatement(
                "INSERT INTO {$table}
                    (bg_no, bg_name, bg_count, bg_member, bg_nomember, bg_receipt, bg_reject)
                 VALUES
                    (1, '미분류', 0, 0, 0, 0, 0)"
            );
        }
    }

    protected function syncAllContactGroupStats(): void
    {
        $this->ensureDefaultContactGroup();
        $groupTable = $this->contactGroupTable();
        $bookTable = $this->contactTable();
        $groups = $this->fetchAllAssociative("SELECT bg_no FROM {$groupTable}");

        foreach ($groups as $group) {
            $groupId = (int)($group['bg_no'] ?? 0);
            if ($groupId <= 0) {
                continue;
            }

            $row = $this->fetchAssociative(
                "SELECT
                    COUNT(*) AS bg_count,
                    SUM(CASE WHEN COALESCE(mb_id, '') <> '' THEN 1 ELSE 0 END) AS bg_member,
                    SUM(CASE WHEN COALESCE(mb_id, '') = '' THEN 1 ELSE 0 END) AS bg_nomember,
                    SUM(CASE WHEN bk_receipt = 1 THEN 1 ELSE 0 END) AS bg_receipt
                 FROM {$bookTable}
                 WHERE bg_no = :bg_no",
                ['bg_no' => $groupId]
            );

            $bgCount = (int)($row['bg_count'] ?? 0);
            $bgMember = (int)($row['bg_member'] ?? 0);
            $bgNoMember = (int)($row['bg_nomember'] ?? 0);
            $bgReceipt = (int)($row['bg_receipt'] ?? 0);
            $bgReject = max(0, $bgCount - $bgReceipt);

            $this->executeStatement(
                "UPDATE {$groupTable}
                 SET bg_count = :bg_count,
                     bg_member = :bg_member,
                     bg_nomember = :bg_nomember,
                     bg_receipt = :bg_receipt,
                     bg_reject = :bg_reject
                 WHERE bg_no = :bg_no",
                [
                    'bg_count' => $bgCount,
                    'bg_member' => $bgMember,
                    'bg_nomember' => $bgNoMember,
                    'bg_receipt' => $bgReceipt,
                    'bg_reject' => $bgReject,
                    'bg_no' => $groupId,
                ]
            );
        }
    }
}
