<?php

declare(strict_types=1);

namespace Tests\Like;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\Enum\VoteType;
use Api\Integration\Contracts\BoardGateway;
use Api\Like\Repository\LikeRepository;
use Api\Support\Exception\ApiException;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class LikeRepositoryTest extends TestCase
{
    public function testCastVotePersistsVoteAndCounterInSingleTransaction(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects(self::exactly(5))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['lock_state' => 1]),
                $this->createResult(['wr_id' => 10, 'mb_id' => 'writer']),
                $this->createResult(false),
                $this->createResult(['wr_good' => 3, 'wr_nogood' => 1]),
                $this->createResult(['released' => 1])
            );
        $qb->expects(self::once())->method('beginTransaction');
        $qb->expects(self::exactly(2))->method('executeStatement');
        $qb->expects(self::once())->method('commit');
        $qb->expects(self::never())->method('rollback');

        $repository = new LikeRepository($this->boardGateway(), $qb, new TableRegistry('g5_'));
        $result = $repository->castVote('free', 10, 'reader', VoteType::Good);

        self::assertSame(['wr_good' => 3, 'wr_nogood' => 1], $result);
    }

    public function testCastVoteRollsBackWhenScoreReloadFails(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects(self::exactly(5))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['lock_state' => 1]),
                $this->createResult(['wr_id' => 10, 'mb_id' => 'writer']),
                $this->createResult(false),
                $this->createResult(false),
                $this->createResult(['released' => 1])
            );
        $qb->expects(self::once())->method('beginTransaction');
        $qb->expects(self::exactly(2))->method('executeStatement');
        $qb->expects(self::never())->method('commit');
        $qb->expects(self::once())->method('rollback');

        $repository = new LikeRepository($this->boardGateway(), $qb, new TableRegistry('g5_'));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('추천 점수 조회 실패');

        $repository->castVote('free', 10, 'reader', VoteType::Good);
    }

    private function boardGateway(): BoardGateway
    {
        $gateway = $this->createMock(BoardGateway::class);
        $gateway
            ->method('getWriteTable')
            ->with('free')
            ->willReturn('g5_write_free');

        return $gateway;
    }

    /**
     * @param array<string, mixed>|false $assoc
     */
    private function createResult(array|false $assoc): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);

        return $result;
    }
}
