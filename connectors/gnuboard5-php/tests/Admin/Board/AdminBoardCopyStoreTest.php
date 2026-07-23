<?php

declare(strict_types=1);

namespace Tests\Admin\Board;

use Api\Admin\Board\Repository\AdminBoardCopyStore;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class AdminBoardCopyStoreTest extends TestCase
{
    public function testCopyPostsCopiesWriteRowsCountsNoticeAndAttachmentMetadata(): void
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn([
            'bo_table' => 'source',
            'bo_subject' => '원본',
            'gr_id' => 'community',
            'bo_count_write' => 4,
            'bo_count_comment' => 2,
            'bo_notice' => '1,3',
        ]);

        $statements = [];
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects(self::once())
            ->method('executeQuery')
            ->with(self::stringContains('FROM g5_board'), ['bo_table' => 'source'])
            ->willReturn($result);
        $qb->expects(self::exactly(4))
            ->method('executeStatement')
            ->willReturnCallback(function (string $sql, array $params = []) use (&$statements): int {
                $statements[] = ['sql' => $sql, 'params' => $params];
                return 1;
            });

        (new AdminBoardCopyStore($qb, new TableRegistry('g5_')))->copyBoard(
            'source',
            'target',
            '복사본',
            true
        );

        self::assertSame(4, $statements[0]['params']['bo_count_write']);
        self::assertSame(2, $statements[0]['params']['bo_count_comment']);
        self::assertSame('1,3', $statements[0]['params']['bo_notice']);
        self::assertStringContainsString('CREATE TABLE g5_write_target LIKE g5_write_source', $statements[1]['sql']);
        self::assertStringContainsString('INSERT INTO g5_write_target SELECT * FROM g5_write_source', $statements[2]['sql']);
        self::assertStringContainsString('INSERT INTO g5_board_file', $statements[3]['sql']);
        self::assertSame('target', $statements[3]['params']['target_bo_table']);
        self::assertSame('source', $statements[3]['params']['source_bo_table']);
    }
}
