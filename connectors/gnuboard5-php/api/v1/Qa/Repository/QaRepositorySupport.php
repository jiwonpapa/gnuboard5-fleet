<?php

/**
 * QaRepositorySupport API module.
 *
 * @package  Gnuboard5\Api\v1\Qa\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Repository;

use Api\Core\Config\EnvConfig;
use Api\Core\Config\EnvValueReader;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Repository\BaseRepository;

abstract class QaRepositorySupport extends BaseRepository
{
    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null
    ) {
        parent::__construct($qb, $tables);
    }

    protected function qaContentTable(): string
    {
        return $this->tables()->get('qa_content');
    }

    protected function qaConfigTable(): string
    {
        return $this->tables()->get('qa_config');
    }

    protected function dataPath(): string
    {
        return EnvConfig::resolveDataPath();
    }

    protected function envString(string $key, string $default): string
    {
        return EnvValueReader::string($key, $default);
    }

    protected function normalizeSearchField(?string $searchField): string
    {
        return match ($searchField) {
            'qa_content' => 'qa_content',
            'qa_name' => 'qa_name',
            'mb_id' => 'mb_id',
            default => 'qa_subject',
        };
    }

    /**
     * @return array<int, string>
     */
    protected function tokenizeExtensions(string $pattern): array
    {
        $splitted = preg_split('/[|,]/', $pattern);
        $parts = array_filter(array_map('trim', is_array($splitted) ? $splitted : []));
        $normalized = [];
        foreach ($parts as $part) {
            $normalized[] = strtolower($part);
        }

        return $normalized;
    }
}
