<?php

declare(strict_types=1);

namespace Api\Admin\Mail\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;
use Api\Core\Util\G5DateTime;

final class AdminMailTemplateRepository extends AdminBaseRepository
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listTemplates(int $page, int $perPage): array
    {
        $table = $this->tables()->get('mail');
        $countRow = $this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$table}");
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT ma_id, ma_subject, ma_content, ma_time, ma_ip, ma_last_option
             FROM {$table}
             ORDER BY ma_id DESC
             LIMIT {$perPage} OFFSET {$offset}"
        );

        return [
            'total' => $total,
            'items' => $items,
        ];
    }

    public function findTemplate(int $mailId): ?array
    {
        $table = $this->tables()->get('mail');
        $row = $this->fetchAssociative(
            "SELECT ma_id, ma_subject, ma_content, ma_time, ma_ip, ma_last_option
             FROM {$table}
             WHERE ma_id = :ma_id
             LIMIT 1",
            ['ma_id' => $mailId]
        );

        return is_array($row) ? $row : null;
    }

    public function createTemplate(string $subject, string $content, string $ipAddress): int
    {
        $table = $this->tables()->get('mail');
        $this->executeStatement(
            "INSERT INTO {$table}
             (ma_subject, ma_content, ma_time, ma_ip, ma_last_option)
             VALUES
             (:ma_subject, :ma_content, :ma_time, :ma_ip, :ma_last_option)",
            [
                'ma_subject' => $subject,
                'ma_content' => $content,
                'ma_time' => G5DateTime::now(),
                'ma_ip' => $ipAddress,
                'ma_last_option' => '',
            ]
        );

        return $this->lastInsertId();
    }

    public function updateTemplate(int $mailId, string $subject, string $content, string $ipAddress): int
    {
        $table = $this->tables()->get('mail');

        return $this->executeStatement(
            "UPDATE {$table}
             SET ma_subject = :ma_subject,
                 ma_content = :ma_content,
                 ma_time = :ma_time,
                 ma_ip = :ma_ip
             WHERE ma_id = :ma_id",
            [
                'ma_id' => $mailId,
                'ma_subject' => $subject,
                'ma_content' => $content,
                'ma_time' => G5DateTime::now(),
                'ma_ip' => $ipAddress,
            ]
        );
    }

    public function saveLastOption(int $mailId, string $lastOption): int
    {
        $table = $this->tables()->get('mail');

        return $this->executeStatement(
            "UPDATE {$table}
             SET ma_last_option = :ma_last_option
             WHERE ma_id = :ma_id",
            [
                'ma_id' => $mailId,
                'ma_last_option' => $lastOption,
            ]
        );
    }

    public function deleteTemplate(int $mailId): int
    {
        $table = $this->tables()->get('mail');

        return $this->executeStatement(
            "DELETE FROM {$table}
             WHERE ma_id = :ma_id",
            ['ma_id' => $mailId]
        );
    }
}
