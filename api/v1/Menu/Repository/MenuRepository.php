<?php

/**
 * MenuRepository API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Menu\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Menu\Repository;

use Api\Core\DTO\MenuDTO;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Integration\Contracts\MenuGateway as LegacyMenuGateway;
use Api\Menu\Contracts\MenuGateway;

final class MenuRepository implements MenuGateway, LegacyMenuGateway
{
    private ?QueryBuilder $resolvedQueryBuilder = null;

    private ?TableRegistry $resolvedTableRegistry = null;

    public function __construct(
        private readonly ?QueryBuilder $qb = null,
        private readonly ?TableRegistry $tables = null
    ) {
    }

    public function list(bool $mobileOnly = false): array
    {
        $menuTable = $this->tables()->get('menu');
        $conditions = ['me_use = 1'];
        $params = [];
        if ($mobileOnly) {
            $conditions[] = 'me_mobile_use = 1';
        }
        $where = implode(' AND ', $conditions);

        $sql = <<<SQL
SELECT
    me_id,
    me_code,
    me_name,
    me_link,
    me_target,
    me_order
FROM {$menuTable}
	WHERE {$where}
	ORDER BY me_order ASC, me_code ASC
SQL;

        $rows = $this->fetchAllAssociative($sql, $params);

        return array_map(
            static fn (array $row): MenuDTO => MenuDTO::fromRow($row),
            $rows
        );
    }

    /**
     * @param array<string, mixed> $params
     * @return array<int, array<string, mixed>>
     */
    private function fetchAllAssociative(string $sql, array $params = []): array
    {
        return $this->queryBuilder()->executeQuery($sql, $params)->fetchAllAssociative();
    }

    private function queryBuilder(): QueryBuilder
    {
        if ($this->resolvedQueryBuilder instanceof QueryBuilder) {
            return $this->resolvedQueryBuilder;
        }

        $this->resolvedQueryBuilder = $this->qb instanceof QueryBuilder
            ? $this->qb
            : new QueryBuilder();

        return $this->resolvedQueryBuilder;
    }

    private function tables(): TableRegistry
    {
        if ($this->resolvedTableRegistry instanceof TableRegistry) {
            return $this->resolvedTableRegistry;
        }

        $this->resolvedTableRegistry = $this->tables instanceof TableRegistry
            ? $this->tables
            : new TableRegistry();

        return $this->resolvedTableRegistry;
    }

}
