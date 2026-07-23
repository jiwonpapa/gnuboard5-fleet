<?php

declare(strict_types=1);

namespace Tests\Comment;

use Api\Comment\Repository\CommentMutationRepository;
use Api\Comment\Repository\CommentPointRepository;
use Api\Comment\Repository\CommentRepository;
use Api\Comment\Repository\CommentQueryRepository;
use Api\Comment\Repository\CommentThreadRepository;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Integration\Contracts\BoardGateway;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class CommentRepositoryTest extends TestCase
{
    public function testCreateRootCommentAssignsSequentialWrComment(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->method('getWriteTable')->with('free')->willReturn('g5_write_free');

        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(3))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['ca_name' => '공지']),
                $this->createResult(['wr_num' => -3]),
                $this->createResult(['next_comment' => 4])
            );

        $statementCalls = [];
        $qb->expects($this->exactly(2))
            ->method('executeStatement')
            ->willReturnCallback(
                static function (string $sql, array $params) use (&$statementCalls): int {
                    $statementCalls[] = [$sql, $params];
                    return 1;
                }
            );
        $qb->expects($this->once())->method('lastInsertId')->willReturn(77);

        $repository = $this->createRepository($boardGateway, $qb);
        $createdId = $repository->createComment(
            'free',
            10,
            ['mb_id' => 'writer', 'mb_name' => '작성자', 'mb_email' => 'writer@example.com'],
            '내용',
            null,
            '127.0.0.1'
        );

        $this->assertSame(77, $createdId);
        $this->assertCount(2, $statementCalls);
        $this->assertSame(-3, $statementCalls[0][1]['wr_num']);
        $this->assertSame(4, $statementCalls[0][1]['wr_comment']);
        $this->assertSame('', $statementCalls[0][1]['wr_comment_reply']);
        $this->assertSame('공지', $statementCalls[0][1]['ca_name']);
    }

    public function testCreateReplyCommentAllocatesAsciiChain(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->method('getWriteTable')->with('free')->willReturn('g5_write_free');

        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(4))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['ca_name' => '질문']),
                $this->createResult(['wr_num' => -5]),
                $this->createResult(['wr_comment' => 2, 'wr_comment_reply' => 'A']),
                $this->createResult(['max_reply' => 'AC'])
            );

        $statementCalls = [];
        $qb->expects($this->exactly(2))
            ->method('executeStatement')
            ->willReturnCallback(
                static function (string $sql, array $params) use (&$statementCalls): int {
                    $statementCalls[] = [$sql, $params];
                    return 1;
                }
            );
        $qb->expects($this->once())->method('lastInsertId')->willReturn(120);

        $repository = $this->createRepository($boardGateway, $qb);
        $createdId = $repository->createComment(
            'free',
            10,
            ['mb_id' => 'reader', 'mb_name' => '리더'],
            '답글',
            33,
            '127.0.0.1'
        );

        $this->assertSame(120, $createdId);
        $this->assertSame(2, $statementCalls[0][1]['wr_comment']);
        $this->assertSame('AD', $statementCalls[0][1]['wr_comment_reply']);
        $this->assertSame('질문', $statementCalls[0][1]['ca_name']);
    }

    public function testCountChildCommentsUsesReplyPrefixTree(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->method('getWriteTable')->with('free')->willReturn('g5_write_free');

        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult([
                    'wr_id' => 33,
                    'wr_parent' => 10,
                    'wr_comment' => 2,
                    'wr_comment_reply' => 'A',
                ]),
                $this->createResult(['cnt' => 3])
            );

        $repository = $this->createRepository($boardGateway, $qb);
        $childCount = $repository->countChildComments('free', 33);

        $this->assertSame(3, $childCount);
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

    private function createRepository(BoardGateway $boardGateway, QueryBuilder $qb): CommentRepository
    {
        $tables = new TableRegistry('g5_');
        $queryRepository = new CommentQueryRepository($boardGateway, $qb, $tables);
        $threadRepository = new CommentThreadRepository($boardGateway, $qb, $tables);
        $mutationRepository = new CommentMutationRepository($boardGateway, $qb, $tables, $threadRepository);
        $pointRepository = new CommentPointRepository($boardGateway, $qb, $tables);

        return new CommentRepository($queryRepository, $mutationRepository, $pointRepository);
    }
}
