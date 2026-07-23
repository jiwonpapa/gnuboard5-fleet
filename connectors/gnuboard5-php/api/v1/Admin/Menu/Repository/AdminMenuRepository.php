<?php

/**
 * AdminMenuRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Menu\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Menu\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;
use Throwable;

final class AdminMenuRepository extends AdminBaseRepository
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        $table = $this->tables()->get('menu');

        return $this->fetchAllAssociative(
            "SELECT
                me_id,
                me_code,
                me_name,
                me_link,
                me_target,
                me_order,
                me_use,
                me_mobile_use
             FROM {$table}
             ORDER BY me_order ASC, me_id ASC"
        );
    }

    public function find(int $menuId): ?array
    {
        $table = $this->tables()->get('menu');
        $row = $this->fetchAssociative(
            "SELECT
                me_id,
                me_code,
                me_name,
                me_link,
                me_target,
                me_order,
                me_use,
                me_mobile_use
             FROM {$table}
             WHERE me_id = :me_id
             LIMIT 1",
            ['me_id' => $menuId]
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(array $payload): int
    {
        $table = $this->tables()->get('menu');

        $this->executeStatement(
            "INSERT INTO {$table}
                (me_code, me_name, me_link, me_target, me_order, me_use, me_mobile_use)
             VALUES
                (:me_code, :me_name, :me_link, :me_target, :me_order, :me_use, :me_mobile_use)",
            [
                'me_code' => (string)$payload['me_code'],
                'me_name' => (string)$payload['me_name'],
                'me_link' => (string)$payload['me_link'],
                'me_target' => (string)($payload['me_target'] ?? '_self'),
                'me_order' => (int)($payload['me_order'] ?? 0),
                'me_use' => (int)($payload['me_use'] ?? 1),
                'me_mobile_use' => (int)($payload['me_mobile_use'] ?? 1),
            ]
        );

        return $this->lastInsertId();
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(int $menuId, array $payload): int
    {
        $table = $this->tables()->get('menu');
        $sets = [];
        $params = ['me_id' => $menuId];

        foreach (['me_code', 'me_name', 'me_link', 'me_target', 'me_order', 'me_use', 'me_mobile_use'] as $field) {
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
            'UPDATE %s SET %s WHERE me_id = :me_id',
            $table,
            implode(', ', $sets)
        );

        return $this->executeStatement($sql, $params);
    }

    public function delete(int $menuId): int
    {
        $table = $this->tables()->get('menu');

        return $this->executeStatement(
            "DELETE FROM {$table} WHERE me_id = :me_id",
            ['me_id' => $menuId]
        );
    }

    /**
     * @param array<int, array{me_id:int, me_order:int}> $orders
     */
    public function reorder(array $orders): void
    {
        if ($orders === []) {
            return;
        }

        $table = $this->tables()->get('menu');
        $this->queryBuilder()->beginTransaction();

        try {
            foreach ($orders as $item) {
                $this->executeStatement(
                    "UPDATE {$table} SET me_order = :me_order WHERE me_id = :me_id",
                    [
                        'me_id' => $item['me_id'],
                        'me_order' => $item['me_order'],
                    ]
                );
            }

            $this->queryBuilder()->commit();
        } catch (Throwable $exception) {
            $this->queryBuilder()->rollback();
            throw $exception;
        }
    }
}
