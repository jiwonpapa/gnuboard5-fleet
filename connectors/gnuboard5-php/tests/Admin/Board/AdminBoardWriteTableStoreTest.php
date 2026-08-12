<?php

declare(strict_types=1);

namespace Tests\Admin\Board;

use Api\Admin\Board\Repository\AdminBoardWriteTableStore;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class AdminBoardWriteTableStoreTest extends TestCase
{
    public function testCreateClonesAnExistingCanonicalWriteTable(): void
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn(['bo_table' => 'free']);

        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects(self::once())
            ->method('executeQuery')
            ->with(self::stringContains('FROM g5_board'), ['bo_table' => 'fleetboard'])
            ->willReturn($result);
        $qb->expects(self::once())
            ->method('executeStatement')
            ->with('CREATE TABLE g5_write_fleetboard LIKE g5_write_free', []);

        (new AdminBoardWriteTableStore($qb, new TableRegistry('g5_')))->create('fleetboard');
    }

    public function testCreateFallsBackToThePinnedCanonicalSchemaWithoutBoards(): void
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn(false);

        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')->willReturn($result);
        $qb->expects(self::once())
            ->method('executeStatement')
            ->with(self::callback(static fn (string $sql): bool =>
                str_contains($sql, 'CREATE TABLE g5_write_fleetboard')
                && str_contains($sql, 'PRIMARY KEY (wr_id)')
                && str_contains($sql, 'wr_num_reply_parent')));

        (new AdminBoardWriteTableStore($qb, new TableRegistry('g5_')))->create('fleetboard');
    }

    public function testDropUsesOnlyTheValidatedBoardTableName(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects(self::once())
            ->method('executeStatement')
            ->with('DROP TABLE IF EXISTS g5_write_fleetboard', []);

        (new AdminBoardWriteTableStore($qb, new TableRegistry('g5_')))->drop('fleetboard');
    }
}
