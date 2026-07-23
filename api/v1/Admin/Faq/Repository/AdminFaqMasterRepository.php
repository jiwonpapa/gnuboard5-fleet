<?php

declare(strict_types=1);

namespace Api\Admin\Faq\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

class AdminFaqMasterRepository extends AdminBaseRepository
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function list(int $page, int $perPage): array
    {
        $masterTable = $this->tables()->get('faq_master');
        $faqTable = $this->tables()->get('faq');
        $countRow = $this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$masterTable}");
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT
                m.fm_id,
                m.fm_subject,
                m.fm_order,
                COUNT(f.fa_id) AS faq_count
             FROM {$masterTable} m
             LEFT JOIN {$faqTable} f ON f.fm_id = m.fm_id
             GROUP BY m.fm_id, m.fm_subject, m.fm_order
             ORDER BY m.fm_order ASC, m.fm_id ASC
             LIMIT {$perPage} OFFSET {$offset}"
        );

        return [
            'total' => $total,
            'items' => $items,
        ];
    }

    public function find(int $masterId): ?array
    {
        $masterTable = $this->tables()->get('faq_master');
        $faqTable = $this->tables()->get('faq');

        $row = $this->fetchAssociative(
            "SELECT
                m.fm_id,
                m.fm_subject,
                m.fm_head_html,
                m.fm_tail_html,
                m.fm_mobile_head_html,
                m.fm_mobile_tail_html,
                m.fm_order,
                COUNT(f.fa_id) AS faq_count
             FROM {$masterTable} m
             LEFT JOIN {$faqTable} f ON f.fm_id = m.fm_id
             WHERE m.fm_id = :fm_id
             GROUP BY
                m.fm_id,
                m.fm_subject,
                m.fm_head_html,
                m.fm_tail_html,
                m.fm_mobile_head_html,
                m.fm_mobile_tail_html,
                m.fm_order
             LIMIT 1",
            ['fm_id' => $masterId]
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function create(array $payload): int
    {
        $table = $this->tables()->get('faq_master');

        $this->executeStatement(
            "INSERT INTO {$table}
             (fm_subject, fm_head_html, fm_tail_html, fm_mobile_head_html, fm_mobile_tail_html, fm_order)
             VALUES
             (:fm_subject, :fm_head_html, :fm_tail_html, :fm_mobile_head_html, :fm_mobile_tail_html, :fm_order)",
            [
                'fm_subject' => (string)$payload['fm_subject'],
                'fm_head_html' => (string)($payload['fm_head_html'] ?? ''),
                'fm_tail_html' => (string)($payload['fm_tail_html'] ?? ''),
                'fm_mobile_head_html' => (string)($payload['fm_mobile_head_html'] ?? ''),
                'fm_mobile_tail_html' => (string)($payload['fm_mobile_tail_html'] ?? ''),
                'fm_order' => (int)($payload['fm_order'] ?? 0),
            ]
        );

        return $this->lastInsertId();
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function update(int $masterId, array $payload): int
    {
        $table = $this->tables()->get('faq_master');
        $sets = [];
        $params = ['fm_id' => $masterId];

        foreach ([
            'fm_subject',
            'fm_head_html',
            'fm_tail_html',
            'fm_mobile_head_html',
            'fm_mobile_tail_html',
            'fm_order',
        ] as $field) {
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

        return $this->executeStatement(
            sprintf(
                'UPDATE %s SET %s WHERE fm_id = :fm_id',
                $table,
                implode(', ', $sets)
            ),
            $params
        );
    }

    public function delete(int $masterId): int
    {
        $table = $this->tables()->get('faq_master');

        return $this->executeStatement(
            "DELETE FROM {$table}
             WHERE fm_id = :fm_id",
            ['fm_id' => $masterId]
        );
    }

    public function deleteItemsByMaster(int $masterId): int
    {
        $table = $this->tables()->get('faq');

        return $this->executeStatement(
            "DELETE FROM {$table}
             WHERE fm_id = :fm_id",
            ['fm_id' => $masterId]
        );
    }
}
