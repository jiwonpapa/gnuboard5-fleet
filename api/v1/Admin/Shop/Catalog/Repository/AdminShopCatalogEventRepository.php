<?php

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Repository;

/**
 * Catalog 이벤트 Repository.
 *
 * @package  Api\Admin\Shop\Catalog\Repository
 * @since    v1.0.0
 */
final class AdminShopCatalogEventRepository extends AdminShopCatalogRepositoryBase
{
    public function listEvents(int $page, int $perPage): array
    {
        $table = $this->shopTable('event');
        if (!$this->tableExists($table)) {
            return ['total' => 0, 'items' => []];
        }

        $count = (int)($this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$table}")['cnt'] ?? 0);
        $offset = ($page - 1) * $perPage;

        $items = $this->fetchAllAssociative(
            "SELECT * FROM {$table} ORDER BY ev_id DESC LIMIT {$perPage} OFFSET {$offset}"
        );

        return [
            'total' => $count,
            'items' => $items,
        ];
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function createEvent(array $payload): array
    {
        $table = $this->shopTable('event');
        if (!$this->tableExists($table)) {
            return [];
        }

        $payload = $this->filterPayload($table, $payload);

        $fields = [];
        $placeholders = [];
        $params = [];
        foreach ($payload as $field => $value) {
            $fields[] = $field;
            $params[$field] = $value;
            $placeholders[] = ':' . $field;
        }

        if ($fields === []) {
            $params['ev_id'] = 0;
            $fields[] = 'ev_id';
            $placeholders[] = ':ev_id';
        }

        $this->executeStatement(
            sprintf(
                'INSERT INTO %s (%s) VALUES (%s)',
                $table,
                implode(', ', $fields),
                implode(', ', $placeholders)
            ),
            $params
        );

        $eventId = $payload[self::EVENT_ID] ?? null;
        $eventId = is_numeric((string)$eventId) ? (int)$eventId : 0;
        if ($eventId <= 0) {
            $eventId = $this->lastInsertId();
        }
        if ($eventId <= 0) {
            return [];
        }

        return $this->findEvent($eventId) ?? [];
    }

    public function findEvent(int $eventId): ?array
    {
        $table = $this->shopTable('event');
        if (!$this->tableExists($table)) {
            return null;
        }

        $row = $this->fetchAssociative(
            "SELECT * FROM {$table} WHERE ev_id = :ev_id LIMIT 1",
            [self::EVENT_ID => $eventId]
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function updateEvent(int $eventId, array $payload): array
    {
        $table = $this->shopTable('event');
        if (!$this->tableExists($table)) {
            return [];
        }

        $payload = $this->filterPayload($table, $payload, [self::EVENT_ID]);
        if ($payload === []) {
            return [];
        }

        $set = [];
        $params = ['ev_id' => $eventId];
        foreach ($payload as $field => $value) {
            $param = 'u_' . $field;
            $set[] = $field . ' = :' . $param;
            $params[$param] = $value;
        }

        $affected = $this->executeStatement(
            sprintf(
                'UPDATE %s SET %s WHERE ev_id = :ev_id',
                $table,
                implode(', ', $set)
            ),
            $params
        );
        if ($affected <= 0) {
            return [];
        }

        return $this->findEvent($eventId) ?? [];
    }

    public function deleteEvent(int $eventId): int
    {
        $table = $this->shopTable('event');
        if (!$this->tableExists($table)) {
            return 0;
        }

        return $this->executeStatement(
            "DELETE FROM {$table} WHERE ev_id = :ev_id",
            ['ev_id' => $eventId]
        );
    }
}
