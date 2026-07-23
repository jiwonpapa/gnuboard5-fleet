<?php

declare(strict_types=1);

namespace Tests\Support;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Repository\BaseRepository;
use PHPUnit\Framework\TestCase;

final class BaseRepositoryTest extends TestCase
{
    public function testQueryBuilderAndTableRegistryAreReused(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $tables = new TableRegistry();

        $repository = new class ($qb, $tables) extends BaseRepository {
            public function exposedQueryBuilder(): QueryBuilder
            {
                return $this->queryBuilder();
            }

            public function exposedTables(): TableRegistry
            {
                return $this->tables();
            }
        };

        $this->assertSame($qb, $repository->exposedQueryBuilder());
        $this->assertSame($qb, $repository->exposedQueryBuilder());
        $this->assertSame($tables, $repository->exposedTables());
        $this->assertSame($tables, $repository->exposedTables());
    }
}
