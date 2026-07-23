<?php

/**
 * G5Config API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Config
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Config;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class G5Config
{
    /** @var array<string, mixed>|null */
    private ?array $cache = null;

    public function __construct(
        private readonly QueryBuilder $qb,
        private readonly TableRegistry $tables
    ) {
    }

    public function get(string $key, mixed $default = null): mixed
    {
        $all = $this->getAll();

        return array_key_exists($key, $all) ? $all[$key] : $default;
    }

    /**
     * @return array<string, mixed>
     */
    public function getAll(): array
    {
        if (is_array($this->cache)) {
            return $this->cache;
        }

        $table = $this->tables->get('config');
        $row = $this->qb->executeQuery("SELECT * FROM {$table} LIMIT 1")->fetchAssociative();

        $this->cache = is_array($row) ? $row : [];

        return $this->cache;
    }
}
