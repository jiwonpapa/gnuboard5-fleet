<?php

/**
 * AdminConfigRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Config\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Config\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminConfigRepository extends AdminBaseRepository
{
    private ?AdminConfigUpdateBuilder $resolvedUpdateBuilder = null;

    public function getConfig(): array
    {
        $table = $this->tables()->get('config');
        $row = $this->fetchAssociative("SELECT * FROM {$table} LIMIT 1");

        return is_array($row) ? $row : [];
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function updateConfig(array $payload): int
    {
        $table = $this->tables()->get('config');
        $update = $this->updateBuilder()->build($payload);
        $sets = $update['sets'];
        $params = $update['params'];

        if ($sets === []) {
            return 0;
        }

        $sql = sprintf(
            'UPDATE %s SET %s LIMIT 1',
            $table,
            implode(', ', $sets)
        );

        return $this->executeStatement($sql, $params);
    }

    public function hasMemberId(string $memberId): bool
    {
        $normalizedMemberId = trim($memberId);
        if ($normalizedMemberId === '') {
            return false;
        }

        $table = $this->tables()->get('member');
        $row = $this->fetchAssociative(
            "SELECT mb_id FROM {$table} WHERE mb_id = :mb_id LIMIT 1",
            ['mb_id' => $normalizedMemberId]
        );

        return is_array($row) && trim((string)($row['mb_id'] ?? '')) !== '';
    }

    private function updateBuilder(): AdminConfigUpdateBuilder
    {
        return $this->resolvedUpdateBuilder ??= new AdminConfigUpdateBuilder();
    }
}
