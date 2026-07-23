<?php

/**
 * AdminFaqRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Faq\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Faq\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminFaqRepository extends AdminBaseRepository
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function list(int $page, int $perPage, ?int $masterId): array
    {
        $faqTable = $this->tables()->get('faq');
        $masterTable = $this->tables()->get('faq_master');
        $where = ' WHERE 1=1 ';
        $params = [];

        if ($masterId !== null) {
            $where .= ' AND f.fm_id = :fm_id ';
            $params['fm_id'] = $masterId;
        }

        $countRow = $this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$faqTable} f {$where}", $params);
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT
            f.fa_id,
            f.fm_id,
            m.fm_subject,
            f.fa_subject,
            f.fa_content,
            f.fa_order
        FROM {$faqTable} f
        LEFT JOIN {$masterTable} m ON m.fm_id = f.fm_id
        {$where}
        ORDER BY f.fa_order ASC, f.fa_id DESC
        LIMIT {$perPage} OFFSET {$offset}";

        return [
            'total' => $total,
            'items' => $this->fetchAllAssociative($sql, $params),
        ];
    }

    public function find(int $faqId): ?array
    {
        $faqTable = $this->tables()->get('faq');
        $masterTable = $this->tables()->get('faq_master');

        $row = $this->fetchAssociative(
            "SELECT
                f.fa_id,
                f.fm_id,
                m.fm_subject,
                f.fa_subject,
                f.fa_content,
                f.fa_order
             FROM {$faqTable} f
             LEFT JOIN {$masterTable} m ON m.fm_id = f.fm_id
             WHERE f.fa_id = :fa_id
             LIMIT 1",
            ['fa_id' => $faqId]
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(array $payload): int
    {
        $table = $this->tables()->get('faq');

        $this->executeStatement(
            "INSERT INTO {$table} (fm_id, fa_subject, fa_content, fa_order)
             VALUES (:fm_id, :fa_subject, :fa_content, :fa_order)",
            [
                'fm_id' => (int)$payload['fm_id'],
                'fa_subject' => (string)$payload['fa_subject'],
                'fa_content' => (string)$payload['fa_content'],
                'fa_order' => (int)($payload['fa_order'] ?? 0),
            ]
        );

        return $this->lastInsertId();
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(int $faqId, array $payload): int
    {
        $table = $this->tables()->get('faq');
        $sets = [];
        $params = ['fa_id' => $faqId];

        foreach (['fm_id', 'fa_subject', 'fa_content', 'fa_order'] as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }

            $param = 'u_' . $field;
            $sets[] = "{$field} = :{$param}";
            $params[$param] = $payload[$field];
        }

        if ($sets === []) {
            return 0;
        }

        $sql = sprintf(
            'UPDATE %s SET %s WHERE fa_id = :fa_id',
            $table,
            implode(', ', $sets)
        );

        return $this->executeStatement($sql, $params);
    }

    public function delete(int $faqId): int
    {
        $table = $this->tables()->get('faq');

        return $this->executeStatement(
            "DELETE FROM {$table} WHERE fa_id = :fa_id",
            ['fa_id' => $faqId]
        );
    }

    public function existsMaster(int $masterId): bool
    {
        $masterTable = $this->tables()->get('faq_master');
        $row = $this->fetchAssociative(
            "SELECT fm_id FROM {$masterTable} WHERE fm_id = :fm_id LIMIT 1",
            ['fm_id' => $masterId]
        );

        return is_array($row);
    }
}
