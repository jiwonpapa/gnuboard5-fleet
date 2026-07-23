<?php

/**
 * AdminPopupRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Popup\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Popup\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

class AdminPopupRepository extends AdminBaseRepository
{
    private const UPDATABLE_FIELDS = [
        'nw_division',
        'nw_device',
        'nw_begin_time',
        'nw_end_time',
        'nw_disable_hours',
        'nw_left',
        'nw_top',
        'nw_height',
        'nw_width',
        'nw_subject',
        'nw_content',
        'nw_content_html',
    ];

    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function list(int $page, int $perPage): array
    {
        $table = $this->tables()->get('new_win');
        $countRow = $this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$table}");
        $total = (int)($countRow['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT
                nw_id,
                nw_division,
                nw_device,
                nw_begin_time,
                nw_end_time,
                nw_disable_hours,
                nw_left,
                nw_top,
                nw_height,
                nw_width,
                nw_subject,
                nw_content_html
             FROM {$table}
             ORDER BY nw_id DESC
             LIMIT {$perPage} OFFSET {$offset}"
        );

        return [
            'total' => $total,
            'items' => $items,
        ];
    }

    public function find(int $popupId): ?array
    {
        $table = $this->tables()->get('new_win');
        $row = $this->fetchAssociative(
            "SELECT *
             FROM {$table}
             WHERE nw_id = :nw_id
             LIMIT 1",
            ['nw_id' => $popupId]
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function create(array $payload): int
    {
        $table = $this->tables()->get('new_win');
        $this->executeStatement(
            "INSERT INTO {$table}
             (nw_division, nw_device, nw_begin_time, nw_end_time, nw_disable_hours, nw_left, nw_top, nw_height, nw_width, nw_subject, nw_content, nw_content_html)
             VALUES
             (:nw_division, :nw_device, :nw_begin_time, :nw_end_time, :nw_disable_hours, :nw_left, :nw_top, :nw_height, :nw_width, :nw_subject, :nw_content, :nw_content_html)",
            $payload
        );

        return $this->lastInsertId();
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function update(int $popupId, array $payload): int
    {
        $table = $this->tables()->get('new_win');
        $sets = [];
        $params = ['nw_id' => $popupId];

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

        return $this->executeStatement(
            "UPDATE {$table}
             SET " . implode(', ', $sets) . "
             WHERE nw_id = :nw_id",
            $params
        );
    }

    public function delete(int $popupId): int
    {
        $table = $this->tables()->get('new_win');

        return $this->executeStatement(
            "DELETE FROM {$table}
             WHERE nw_id = :nw_id",
            ['nw_id' => $popupId]
        );
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function listActive(string $now, string $device, string $division): array
    {
        $table = $this->tables()->get('new_win');

        return $this->fetchAllAssociative(
            "SELECT
                nw_id,
                nw_division,
                nw_device,
                nw_begin_time,
                nw_end_time,
                nw_disable_hours,
                nw_left,
                nw_top,
                nw_height,
                nw_width,
                nw_subject,
                nw_content,
                nw_content_html
             FROM {$table}
             WHERE :now BETWEEN nw_begin_time AND nw_end_time
               AND nw_device IN ('both', :device)
               AND nw_division IN ('both', :division)
             ORDER BY nw_id ASC",
            [
                'now' => $now,
                'device' => $device,
                'division' => $division,
            ]
        );
    }
}
