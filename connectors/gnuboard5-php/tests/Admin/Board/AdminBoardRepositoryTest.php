<?php

declare(strict_types=1);

namespace Tests\Admin\Board;

use Api\Admin\Board\Repository\AdminBoardRepository;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class AdminBoardRepositoryTest extends TestCase
{
    public function testListAppliesGroupFilterWhenGrIdIsProvided(): void
    {
        $queries = [];
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects(self::exactly(2))
            ->method('executeQuery')
            ->willReturnCallback(function (string $sql, array $params = []) use (&$queries): Result {
                $queries[] = ['sql' => $sql, 'params' => $params];

                if (str_contains($sql, 'COUNT(*) AS cnt')) {
                    return $this->createResult(['cnt' => 1]);
                }

                return $this->createResult(false, [
                    ['bo_table' => 'notice', 'gr_id' => 'community'],
                ]);
            });

        $repository = new AdminBoardRepository($qb, new TableRegistry('g5_'));
        $result = $repository->list(1, 20, 'community', null, 'bo_table', 'ASC');

        self::assertSame('community', $queries[0]['params']['gr_id'] ?? null);
        self::assertStringContainsString('AND gr_id = :gr_id', $queries[0]['sql']);
        self::assertStringContainsString('AND gr_id = :gr_id', $queries[1]['sql']);
        self::assertSame('notice', $result['items'][0]['bo_table']);
    }

    public function testUpdateAcceptsLegacyParityFields(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects(self::once())
            ->method('executeStatement')
            ->with(
                self::callback(static function (string $sql): bool {
                    return str_contains($sql, 'bo_admin = :u_bo_admin')
                        && str_contains($sql, 'bo_device = :u_bo_device')
                        && str_contains($sql, 'bo_write_point = :u_bo_write_point')
                        && str_contains($sql, 'bo_use_search = :u_bo_use_search')
                        && str_contains($sql, 'bo_include_head = :u_bo_include_head')
                        && str_contains($sql, 'bo_select_editor = :u_bo_select_editor')
                        && str_contains($sql, 'bo_list_level = :u_bo_list_level')
                        && str_contains($sql, 'bo_skin = :u_bo_skin')
                        && str_contains($sql, 'bo_content_head = :u_bo_content_head')
                        && str_contains($sql, 'bo_1 = :u_bo_1');
                }),
                self::callback(static function (array $params): bool {
                    return ($params['bo_table'] ?? null) === 'free'
                        && ($params['u_bo_admin'] ?? null) === 'neo'
                        && ($params['u_bo_device'] ?? null) === 'mobile'
                        && ($params['u_bo_write_point'] ?? null) === 100
                        && ($params['u_bo_use_search'] ?? null) === 1
                        && ($params['u_bo_include_head'] ?? null) === '_head.php'
                        && ($params['u_bo_select_editor'] ?? null) === 'smarteditor2'
                        && ($params['u_bo_list_level'] ?? null) === 2
                        && ($params['u_bo_skin'] ?? null) === 'basic'
                        && ($params['u_bo_content_head'] ?? null) === '<p>head</p>'
                        && ($params['u_bo_1'] ?? null) === 'extra';
                })
            )
            ->willReturn(1);

        $repository = new AdminBoardRepository($qb, new TableRegistry('g5_'));
        $affected = $repository->update('free', [
            'bo_admin' => 'neo',
            'bo_device' => 'mobile',
            'bo_write_point' => 100,
            'bo_use_search' => 1,
            'bo_include_head' => '_head.php',
            'bo_select_editor' => 'smarteditor2',
            'bo_list_level' => 2,
            'bo_skin' => 'basic',
            'bo_content_head' => '<p>head</p>',
            'bo_1' => 'extra',
        ]);

        self::assertSame(1, $affected);
    }

    private function createResult(array|false $assoc, array $all = []): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);
        $result->method('fetchAllAssociative')->willReturn($all);

        return $result;
    }
}
