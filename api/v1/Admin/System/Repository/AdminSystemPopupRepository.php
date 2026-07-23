<?php

/**
 * AdminSystemPopupRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminSystemPopupRepository extends AdminBaseRepository
{
    /**
     * @return array{total:int,items:array<int,array<string,mixed>>}
     */
    public function listPopups(int $page, int $perPage): array
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

    public function findPopup(int $popupId): ?array
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
     * @param array<string, mixed> $payload
     */
    public function createPopup(array $payload): int
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
     * @param array<string, mixed> $payload
     */
    public function updatePopup(int $popupId, array $payload): int
    {
        $table = $this->tables()->get('new_win');
        $sets = [];
        $params = ['nw_id' => $popupId];
        foreach ($payload as $field => $value) {
            $param = 'u_' . $field;
            $sets[] = "{$field} = :{$param}";
            $params[$param] = $value;
        }

        if ($sets === []) {
            return 0;
        }

        return $this->executeStatement(
            "UPDATE {$table} SET " . implode(', ', $sets) . " WHERE nw_id = :nw_id",
            $params
        );
    }

    public function deletePopup(int $popupId): int
    {
        $table = $this->tables()->get('new_win');

        return $this->executeStatement(
            "DELETE FROM {$table}
             WHERE nw_id = :nw_id",
            ['nw_id' => $popupId]
        );
    }
}
