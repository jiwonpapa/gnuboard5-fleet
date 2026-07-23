<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Doctrine\DBAL\ArrayParameterType;

final class AdminSmsContactBatchStore extends AdminSmsContactStoreBase
{
    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null
    ) {
        parent::__construct($qb, $tables);
    }

    /**
     * @param list<int> $contactIds
     * @return array<string,mixed>
     */
    public function batchUpdateContacts(string $action, array $contactIds, ?int $targetGroupId = null): array
    {
        $this->requireContactStorage('SMS 연락처 일괄 처리');
        $before = $this->fetchAllAssociative(
            "SELECT bk_no, bg_no, mb_id, bk_name, bk_hp, bk_receipt, bk_memo
             FROM {$this->contactTable()}
             WHERE bk_no IN (:ids)",
            ['ids' => $contactIds],
            ['ids' => ArrayParameterType::INTEGER]
        );

        switch ($action) {
            case 'allow':
            case 'reject':
                $affected = $this->executeStatement(
                    "UPDATE {$this->contactTable()}
                     SET bk_receipt = :bk_receipt
                     WHERE bk_no IN (:ids)",
                    [
                        'bk_receipt' => $action === 'allow' ? 1 : 0,
                        'ids' => $contactIds,
                    ],
                    ['ids' => ArrayParameterType::INTEGER]
                );
                break;
            case 'move':
                $affected = $this->executeStatement(
                    "UPDATE {$this->contactTable()}
                     SET bg_no = :bg_no
                     WHERE bk_no IN (:ids)",
                    [
                        'bg_no' => $targetGroupId,
                        'ids' => $contactIds,
                    ],
                    ['ids' => ArrayParameterType::INTEGER]
                );
                break;
            case 'copy':
                $affected = 0;
                foreach ($before as $row) {
                    $this->executeStatement(
                        "INSERT INTO {$this->contactTable()}
                            (bg_no, mb_id, bk_name, bk_hp, bk_receipt, bk_datetime, bk_memo)
                         VALUES
                            (:bg_no, :mb_id, :bk_name, :bk_hp, :bk_receipt, :bk_datetime, :bk_memo)",
                        [
                            'bg_no' => $targetGroupId,
                            'mb_id' => (string)($row['mb_id'] ?? ''),
                            'bk_name' => (string)($row['bk_name'] ?? ''),
                            'bk_hp' => (string)($row['bk_hp'] ?? ''),
                            'bk_receipt' => (int)($row['bk_receipt'] ?? 0),
                            'bk_datetime' => $this->now(),
                            'bk_memo' => (string)($row['bk_memo'] ?? ''),
                        ]
                    );
                    $affected++;
                }
                break;
            default:
                $affected = $this->executeStatement(
                    "DELETE FROM {$this->contactTable()} WHERE bk_no IN (:ids)",
                    ['ids' => $contactIds],
                    ['ids' => ArrayParameterType::INTEGER]
                );
                break;
        }

        $this->syncAllContactGroupStats();

        return [
            'action' => $action,
            'affected' => $affected,
            'target_bg_no' => $targetGroupId,
        ];
    }
}
