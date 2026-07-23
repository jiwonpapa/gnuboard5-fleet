<?php

/**
 * AdminSystemMailRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;
use Api\Core\Util\G5DateTime;

final class AdminSystemMailRepository extends AdminBaseRepository
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listMailTemplates(int $page, int $perPage): array
    {
        $table = $this->tables()->get('mail');
        $countRow = $this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$table}");
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT ma_id, ma_subject, ma_time, ma_ip, ma_last_option
             FROM {$table}
             ORDER BY ma_id DESC
             LIMIT {$perPage} OFFSET {$offset}"
        );

        return [
            'total' => $total,
            'items' => $items,
        ];
    }

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listMailRecipients(int $page, int $perPage, ?string $search): array
    {
        $table = $this->tables()->get('member');
        $where = " WHERE mb_leave_date = '' AND mb_intercept_date = '' ";
        $params = [];
        $searchTerm = trim((string)$search);
        if ($searchTerm !== '') {
            $where .= ' AND (mb_id LIKE :search OR mb_name LIKE :search OR mb_nick LIKE :search OR mb_email LIKE :search) ';
            $params['search'] = '%' . $searchTerm . '%';
        }

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$table} {$where}",
            $params
        );
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT mb_id, mb_name, mb_nick, mb_email, mb_level, mb_mailling, mb_today_login
             FROM {$table}
             {$where}
             ORDER BY mb_id ASC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        );

        return [
            'total' => $total,
            'items' => $items,
        ];
    }

    /**
     * @param array<int,string> $memberIds
     * @return array<int,array<string,mixed>>
     */
    public function findMailRecipientsByIds(array $memberIds, bool $maillingOnly): array
    {
        $normalized = array_values(array_unique(array_filter(array_map(
            static fn ($value): string => trim((string)$value),
            $memberIds
        ))));
        if ($normalized === []) {
            return [];
        }

        $table = $this->tables()->get('member');
        $whereParts = [];
        $params = [];
        foreach ($normalized as $index => $memberId) {
            $param = 'mb_id_' . $index;
            $whereParts[] = ':' . $param;
            $params[$param] = $memberId;
        }

        $where = "mb_id IN (" . implode(', ', $whereParts) . ") AND mb_leave_date = '' AND mb_intercept_date = ''";
        if ($maillingOnly) {
            $where .= " AND mb_mailling = '1'";
        }

        return $this->fetchAllAssociative(
            "SELECT mb_id, mb_name, mb_nick, mb_email, mb_level, mb_mailling, mb_datetime
             FROM {$table}
             WHERE {$where}
             ORDER BY mb_id ASC",
            $params
        );
    }

    public function findMailTemplate(int $mailId): ?array
    {
        if ($mailId <= 0) {
            return null;
        }

        $table = $this->tables()->get('mail');
        $row = $this->fetchAssociative(
            "SELECT ma_id, ma_subject, ma_content
             FROM {$table}
             WHERE ma_id = :ma_id
             LIMIT 1",
            ['ma_id' => $mailId]
        );

        return is_array($row) ? $row : null;
    }

    public function createMailTestRecord(string $subject, string $content, string $ipAddress, array $meta = []): int
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
                'ma_last_option' => json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}',
            ]
        );

        return $this->lastInsertId();
    }
}
