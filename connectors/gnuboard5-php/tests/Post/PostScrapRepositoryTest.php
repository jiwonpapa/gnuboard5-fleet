<?php

declare(strict_types=1);

namespace Tests\Post;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Integration\Contracts\BoardGateway;
use Api\Post\Repository\PostScrapCountStore;
use Api\Post\Repository\PostScrapMutationRepository;
use Api\Post\Repository\PostScrapQueryRepository;
use Api\Post\Repository\PostScrapRepository;
use Api\Post\Repository\PostScrapWriteStore;
use Api\Support\Exception\ApiException;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class PostScrapRepositoryTest extends TestCase
{
    public function testGetScrapListLoadsPostsInBoardBatches(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(4))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['cnt' => 3]),
                $this->createResult(
                    false,
                    [
                        [
                            'ms_id' => 30,
                            'bo_table' => 'free',
                            'wr_id' => 10,
                            'ms_datetime' => '2026-03-06 12:00:00',
                            'bo_subject' => '자유게시판',
                        ],
                        [
                            'ms_id' => 29,
                            'bo_table' => 'free',
                            'wr_id' => 11,
                            'ms_datetime' => '2026-03-06 11:59:00',
                            'bo_subject' => '자유게시판',
                        ],
                        [
                            'ms_id' => 28,
                            'bo_table' => 'notice',
                            'wr_id' => 7,
                            'ms_datetime' => '2026-03-06 11:58:00',
                            'bo_subject' => '공지사항',
                        ],
                    ]
                ),
                $this->createResult(
                    false,
                    [
                        [
                            'wr_id' => 10,
                            'wr_subject' => '첫 번째 스크랩',
                            'wr_name' => '작성자1',
                            'wr_datetime' => '2026-03-05 10:00:00',
                            'mb_id' => 'writer1',
                        ],
                    ]
                ),
                $this->createResult(
                    false,
                    [
                        [
                            'wr_id' => 7,
                            'wr_subject' => '공지 스크랩',
                            'wr_name' => '관리자',
                            'wr_datetime' => '2026-03-05 09:00:00',
                            'mb_id' => 'admin',
                        ],
                    ]
                )
            );

        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->method('getBoardTable')->willReturn('g5_board');
        $boardGateway->method('getWriteTable')->willReturnMap([
            ['free', 'g5_write_free'],
            ['notice', 'g5_write_notice'],
        ]);

        $repository = $this->createRepository($boardGateway, $qb);
        $result = $repository->getScrapList('neo', 1, 10);

        $this->assertSame(3, $result['total']);
        $this->assertCount(3, $result['items']);
        $this->assertSame('첫 번째 스크랩', $result['items'][0]['wr_subject']);
        $this->assertTrue($result['items'][0]['post_exists']);
        $this->assertSame('', $result['items'][1]['wr_subject']);
        $this->assertFalse($result['items'][1]['post_exists']);
        $this->assertSame('공지 스크랩', $result['items'][2]['wr_subject']);
        $this->assertSame('admin', $result['items'][2]['mb_id']);
    }

    public function testAddScrapRejectsDuplicateWithinMemberLock(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(3))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['lock_state' => 1]),
                $this->createResult(['ms_id' => 77]),
                $this->createResult(['released' => 1])
            );
        $qb->expects($this->once())->method('beginTransaction');
        $qb->expects($this->never())->method('executeStatement');
        $qb->expects($this->never())->method('commit');
        $qb->expects($this->once())->method('rollback');

        $boardGateway = $this->createMock(BoardGateway::class);
        $repository = $this->createRepository($boardGateway, $qb);

        $this->expectException(ApiException::class);
        $repository->addScrap('neo', 'free', 10);
    }

    public function testAddScrapSyncsCountWithinSingleTransaction(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(3))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['lock_state' => 1]),
                $this->createResult(false),
                $this->createResult(['released' => 1])
            );
        $qb->expects($this->once())->method('beginTransaction');
        $qb->expects($this->exactly(2))->method('executeStatement');
        $qb->expects($this->once())->method('lastInsertId')->willReturn(88);
        $qb->expects($this->once())->method('commit');
        $qb->expects($this->never())->method('rollback');

        $boardGateway = $this->createMock(BoardGateway::class);
        $repository = $this->createRepository($boardGateway, $qb);

        $result = $repository->addScrap('neo', 'free', 10);

        $this->assertSame(88, $result);
    }

    public function testRemoveScrapSyncsCountWithinSingleTransaction(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['lock_state' => 1]),
                $this->createResult(['released' => 1])
            );
        $qb->expects($this->once())->method('beginTransaction');
        $qb->expects($this->exactly(2))->method('executeStatement');
        $qb->expects($this->once())->method('commit');
        $qb->expects($this->never())->method('rollback');

        $boardGateway = $this->createMock(BoardGateway::class);
        $repository = $this->createRepository($boardGateway, $qb);

        $repository->removeScrap('neo', 'free', 10);

        $this->addToAssertionCount(1);
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

    private function createRepository(BoardGateway $boardGateway, QueryBuilder $qb): PostScrapRepository
    {
        $tables = new TableRegistry('g5_');
        $queryRepository = new PostScrapQueryRepository($boardGateway, $qb, $tables);
        $countStore = new PostScrapCountStore($boardGateway, $qb, $tables);
        $writeStore = new PostScrapWriteStore($boardGateway, $countStore, $qb, $tables);
        $mutationRepository = new PostScrapMutationRepository($boardGateway, $qb, $tables, $writeStore, $countStore);

        return new PostScrapRepository($queryRepository, $mutationRepository);
    }
}
