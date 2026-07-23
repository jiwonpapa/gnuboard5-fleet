<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

abstract class AdminSmsTemplateStoreBase extends AdminSmsRepositoryBase
{
    protected function syncAllTemplateGroupStats(): void
    {
        $groupTable = $this->templateGroupTable();
        $templateTable = $this->templateTable();

        $this->executeStatement("UPDATE {$groupTable} SET fg_count = 0");
        $rows = $this->fetchAllAssociative(
            "SELECT fg_no, COUNT(*) AS cnt
             FROM {$templateTable}
             WHERE fg_no > 0
             GROUP BY fg_no"
        );

        foreach ($rows as $row) {
            $this->executeStatement(
                "UPDATE {$groupTable}
                 SET fg_count = :fg_count
                 WHERE fg_no = :fg_no",
                [
                    'fg_count' => (int)($row['cnt'] ?? 0),
                    'fg_no' => (int)($row['fg_no'] ?? 0),
                ]
            );
        }
    }

    protected function syncTemplateGroupCount(int $groupId): void
    {
        if ($groupId <= 0) {
            return;
        }

        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$this->templateTable()} WHERE fg_no = :fg_no",
            ['fg_no' => $groupId]
        );

        $this->executeStatement(
            "UPDATE {$this->templateGroupTable()}
             SET fg_count = :fg_count
             WHERE fg_no = :fg_no",
            [
                'fg_count' => (int)($row['cnt'] ?? 0),
                'fg_no' => $groupId,
            ]
        );
    }

    protected function countTemplatesByGroup(int $groupId): int
    {
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$this->templateTable()} WHERE fg_no = :fg_no",
            ['fg_no' => $groupId]
        );

        return (int)($row['cnt'] ?? 0);
    }
}
