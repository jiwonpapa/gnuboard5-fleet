<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

final class AdminSmsMemberSyncStore extends AdminSmsContactStoreBase
{
    /**
     * @return array<string,mixed>
     */
    public function syncMembers(): array
    {
        $this->requireContactStorage('SMS 회원 동기화', true);
        $this->ensureDefaultContactGroup();
        $memberTable = $this->memberTable();
        $bookTable = $this->contactTable();
        $smsConfigTable = $this->smsConfigTable();

        $rows = $this->fetchAllAssociative(
            "SELECT mb_id, mb_name, mb_hp, mb_sms, mb_leave_date
             FROM {$memberTable}
             ORDER BY mb_datetime ASC, mb_id ASC"
        );

        $count = 0;
        $hpYes = 0;
        $hpNo = 0;
        $hpEmpty = 0;
        $leave = 0;
        $receipt = 0;

        $this->queryBuilder()->beginTransaction();
        try {
            foreach ($rows as $row) {
                $count++;
                $memberId = trim((string)($row['mb_id'] ?? ''));
                if ($memberId === '') {
                    continue;
                }

                $leaveDate = trim((string)($row['mb_leave_date'] ?? ''));
                $rawPhone = trim((string)($row['mb_hp'] ?? ''));
                $phone = $this->normalizeMobilePhone($rawPhone);
                $name = trim((string)($row['mb_name'] ?? ''));
                $allowReceipt = $phone !== '' ? (int)($row['mb_sms'] ?? 0) : 0;

                if ($leaveDate !== '') {
                    $leave++;
                } elseif ($rawPhone === '') {
                    $hpEmpty++;
                } elseif ($phone !== '') {
                    $hpYes++;
                    if ($allowReceipt === 1) {
                        $receipt++;
                    }
                } else {
                    $hpNo++;
                }

                if ($leaveDate !== '') {
                    $this->executeStatement(
                        "DELETE FROM {$bookTable} WHERE mb_id = :mb_id",
                        ['mb_id' => $memberId]
                    );
                    continue;
                }

                $exists = $this->fetchAssociative(
                    "SELECT bk_no FROM {$bookTable} WHERE mb_id = :mb_id LIMIT 1",
                    ['mb_id' => $memberId]
                );

                if (is_array($exists)) {
                    $this->executeStatement(
                        "UPDATE {$bookTable}
                         SET bk_name = :bk_name,
                             bk_hp = :bk_hp,
                             bk_receipt = :bk_receipt,
                             bk_datetime = :bk_datetime
                         WHERE mb_id = :mb_id",
                        [
                            'bk_name' => $name,
                            'bk_hp' => $phone,
                            'bk_receipt' => $allowReceipt,
                            'bk_datetime' => $this->now(),
                            'mb_id' => $memberId,
                        ]
                    );
                    continue;
                }

                $this->executeStatement(
                    "INSERT INTO {$bookTable}
                        (bg_no, mb_id, bk_name, bk_hp, bk_receipt, bk_datetime, bk_memo)
                     VALUES
                        (1, :mb_id, :bk_name, :bk_hp, :bk_receipt, :bk_datetime, '')",
                    [
                        'mb_id' => $memberId,
                        'bk_name' => $name,
                        'bk_hp' => $phone,
                        'bk_receipt' => $allowReceipt,
                        'bk_datetime' => $this->now(),
                    ]
                );
            }

            $this->syncAllContactGroupStats();
            $this->executeStatement(
                "UPDATE {$smsConfigTable} SET cf_datetime = :cf_datetime",
                ['cf_datetime' => $this->now()]
            );
            $this->queryBuilder()->commit();
        } catch (\Throwable $e) {
            $this->queryBuilder()->rollback();
            throw $e;
        }

        return [
            'datetime' => $this->now(),
            'summary' => [
                'total_members' => $count,
                'leave_members' => $leave,
                'phone_empty' => $hpEmpty,
                'phone_valid' => $hpYes,
                'phone_invalid' => $hpNo,
                'receipt_enabled' => $receipt,
                'receipt_disabled' => max(0, $hpYes - $receipt),
            ],
        ];
    }
}
