<?php

declare(strict_types=1);

namespace Tests\Memo;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Memo\Repository\MemoListQueryRepository;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class MemoListQueryRepositoryTest extends TestCase
{
    public function testGetListReturnsItemsAndPaginationFields(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['cnt' => 2]),
                $this->createResult(false, [[
                    'me_id' => 9,
                    'me_recv_mb_id' => 'recv1',
                    'me_send_mb_id' => 'send1',
                    'me_send_datetime' => '2026-03-13 10:00:00',
                    'me_read_datetime' => '1000-01-01 00:00:00',
                    'me_memo' => '내용',
                    'me_send_id' => 1,
                    'me_type' => 'recv',
                    'me_send_ip' => '127.0.0.1',
                    'counterpart_mb_id' => 'send1',
                    'counterpart_mb_nick' => '보낸이',
                ]])
            );

        $repository = $this->createRepository($qb);
        $result = $repository->getList('recv1', 'recv', 1, 20);

        $this->assertSame(2, $result['total']);
        $this->assertSame(1, $result['page']);
        $this->assertSame(20, $result['per_page']);
        $this->assertSame(9, $result['items'][0]['me_id']);
        $this->assertFalse($result['items'][0]['is_read']);
    }

    public function testGetListByCursorBuildsNextCursor(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult(false, [
                $this->memoRow(10),
                $this->memoRow(9),
            ]));

        $repository = $this->createRepository($qb);
        $result = $repository->getListByCursor('recv1', 'recv', 1, null);

        $this->assertCount(1, $result->items);
        $this->assertTrue($result->pagination->hasNext);
        $this->assertNotNull($result->pagination->nextCursor);
    }

    public function testGetByIdAndCountUnreadUseDetailRepository(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult($this->memoRow(7)),
                $this->createResult(['cnt' => 3])
            );

        $repository = $this->createRepository($qb);
        $detail = $repository->getById(7, 'recv1', 'recv');

        $this->assertSame(7, $detail['me_id']);
        $this->assertSame(3, $repository->countUnread('recv1'));
    }

    /**
     * @param array<string, mixed>|false $assoc
     * @param array<int, array<string, mixed>> $all
     */
    private function createResult(array|false $assoc, array $all = []): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);
        $result->method('fetchAllAssociative')->willReturn($all);

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    private function memoRow(int $meId): array
    {
        return [
            'me_id' => $meId,
            'me_recv_mb_id' => 'recv1',
            'me_send_mb_id' => 'send1',
            'me_send_datetime' => '2026-03-13 10:00:00',
            'me_read_datetime' => '',
            'me_memo' => '내용',
            'me_send_id' => 1,
            'me_type' => 'recv',
            'me_send_ip' => '127.0.0.1',
            'counterpart_mb_id' => 'send1',
            'counterpart_mb_nick' => '보낸이',
        ];
    }

    private function createRepository(QueryBuilder $qb): MemoListQueryRepository
    {
        return new MemoListQueryRepository($qb, new TableRegistry('g5_'));
    }
}
