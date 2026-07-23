<?php

declare(strict_types=1);

namespace Tests\Admin\Common;

use Api\Admin\Common\Repository\AdminBaseRepository;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use PHPUnit\Framework\TestCase;

final class AdminBaseRepositoryTest extends TestCase
{
    public function testQueryBuilderAndTableRegistryAreReused(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $tables = new TableRegistry();

        $repository = new class ($qb, $tables) extends AdminBaseRepository {
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
