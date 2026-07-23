<?php

/**
 * AdminContentRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Content\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Content\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminContentRepository extends AdminBaseRepository
{
    private const SELECT_FIELDS = 'co_id, co_subject, co_html, co_content, co_mobile_content,
        co_include_head, co_include_tail, co_tag_filter_use, co_skin, co_mobile_skin';

    private const UPDATABLE_FIELDS = [
        'co_subject',
        'co_html',
        'co_content',
        'co_mobile_content',
        'co_include_head',
        'co_include_tail',
        'co_tag_filter_use',
        'co_skin',
        'co_mobile_skin',
    ];

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function list(int $page, int $perPage, ?string $search): array
    {
        $table = $this->tables()->get('content');
        $where = ' WHERE 1=1 ';
        $params = [];

        $searchTerm = trim((string)$search);
        if ($searchTerm !== '') {
            $where .= ' AND (co_id LIKE :search OR co_subject LIKE :search) ';
            $params['search'] = '%' . $searchTerm . '%';
        }

        $countRow = $this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$table} {$where}", $params);
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT " . self::SELECT_FIELDS . "
             FROM {$table}
             {$where}
             ORDER BY co_id ASC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        );

        return [
            'total' => $total,
            'items' => $items,
        ];
    }

    public function find(string $contentId): ?array
    {
        $table = $this->tables()->get('content');
        $row = $this->fetchAssociative(
            "SELECT " . self::SELECT_FIELDS . "
             FROM {$table}
             WHERE co_id = :co_id
             LIMIT 1",
            ['co_id' => $contentId]
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(array $payload): void
    {
        $table = $this->tables()->get('content');

        $data = [
            'co_id' => (string)$payload['co_id'],
            'co_subject' => (string)$payload['co_subject'],
            'co_html' => (int)($payload['co_html'] ?? 0),
            'co_content' => (string)$payload['co_content'],
            'co_mobile_content' => (string)($payload['co_mobile_content'] ?? ''),
            'co_include_head' => (string)($payload['co_include_head'] ?? ''),
            'co_include_tail' => (string)($payload['co_include_tail'] ?? ''),
            'co_tag_filter_use' => (int)($payload['co_tag_filter_use'] ?? 1),
            'co_skin' => (string)($payload['co_skin'] ?? ''),
            'co_mobile_skin' => (string)($payload['co_mobile_skin'] ?? ''),
        ];

        $columns = array_keys($data);
        $placeholders = array_map(static fn (string $column): string => ':' . $column, $columns);

        $this->executeStatement(
            sprintf(
                'INSERT INTO %s (%s) VALUES (%s)',
                $table,
                implode(', ', $columns),
                implode(', ', $placeholders)
            ),
            $data
        );
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(string $contentId, array $payload): int
    {
        $table = $this->tables()->get('content');
        $sets = [];
        $params = ['co_id' => $contentId];

        foreach (self::UPDATABLE_FIELDS as $field) {
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
            'UPDATE %s SET %s WHERE co_id = :co_id',
            $table,
            implode(', ', $sets)
        );

        return $this->executeStatement($sql, $params);
    }

    public function delete(string $contentId): int
    {
        $table = $this->tables()->get('content');

        return $this->executeStatement(
            "DELETE FROM {$table} WHERE co_id = :co_id",
            ['co_id' => $contentId]
        );
    }
}
