<?php

declare(strict_types=1);

namespace Tests\Block;

use Api\Block\Repository\BlockRepository;
use Api\Block\Service\BlockService;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Exception\ApiException;
use Api\Support\Pagination\CursorCodec;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class BlockServiceTest extends TestCase
{
    protected function setUp(): void
    {
        $this->resetTableReady(BlockRepository::class);
    }

    public function testListMineRequiresAuthentication(): void
    {
        $service = new BlockService($this->createRepository($this->createMock(QueryBuilder::class)));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('인증 토큰이 필요합니다.');

        $service->listMine([], 1, 20);
    }

    public function testListMineBuildsPagination(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeStatement')
            ->willReturn(0);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(
                    false,
                    [
                        [
                            'ub_id' => 2,
                            'mb_id' => 'member1',
                            'blocked_mb_id' => 'member2',
                            'ub_datetime' => '2026-03-06 12:20:00',
                        ],
                    ]
                ),
                $this->createResult(['cnt' => 3])
            );

        $service = new BlockService($this->createRepository($qb));
        $result = $service->listMine(['mb_id' => 'member1'], 1, 2);

        $this->assertCount(1, $result['items']);
        $this->assertSame(3, $result['pagination']['total']);
        $this->assertSame(2, $result['pagination']['last_page']);
        $this->assertTrue($result['pagination']['has_next']);
        $this->assertFalse($result['pagination']['has_prev']);
    }

    public function testBlockRejectsSelfBlocking(): void
    {
        $service = new BlockService($this->createRepository($this->createMock(QueryBuilder::class)));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('본인 계정은 차단할 수 없습니다.');

        $service->block(['mb_id' => 'member1'], ['blocked_mb_id' => 'member1']);
    }

    public function testListMineSupportsCursorPagination(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeStatement')
            ->willReturn(0);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn(
                $this->createResult(
                    false,
                    [
                        [
                            'ub_id' => 9,
                            'mb_id' => 'member1',
                            'blocked_mb_id' => 'member9',
                            'ub_datetime' => '2026-03-06 12:20:00',
                        ],
                        [
                            'ub_id' => 8,
                            'mb_id' => 'member1',
                            'blocked_mb_id' => 'member8',
                            'ub_datetime' => '2026-03-06 12:10:00',
                        ],
                        [
                            'ub_id' => 7,
                            'mb_id' => 'member1',
                            'blocked_mb_id' => 'member7',
                            'ub_datetime' => '2026-03-06 12:00:00',
                        ],
                    ]
                )
            );

        $service = new BlockService($this->createRepository($qb));
        $result = $service->listMine(
            ['mb_id' => 'member1'],
            1,
            2,
            CursorCodec::encode('block.list', 10)
        );

        $this->assertCount(2, $result['items']);
        $this->assertSame('cursor', $result['pagination']['mode']);
        $this->assertTrue($result['pagination']['has_next']);
        $this->assertNotEmpty($result['pagination']['next_cursor']);
    }

    public function testUnblockThrowsWhenBlockMissing(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeStatement')
            ->willReturnOnConsecutiveCalls(0, 0);

        $service = new BlockService($this->createRepository($qb));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('차단 정보가 없습니다.');

        $service->unblock(['mb_id' => 'member1'], 'member2');
    }

    private function createRepository(QueryBuilder $qb): BlockRepository
    {
        return new BlockRepository($qb, new TableRegistry('g5_'));
    }

    private function createResult(array|false $assoc, array $all = []): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);
        $result->method('fetchAllAssociative')->willReturn($all);

        return $result;
    }

    private function resetTableReady(string $className): void
    {
        $property = new \ReflectionProperty($className, 'tableReady');
        $property->setValue(null, false);
    }
}
