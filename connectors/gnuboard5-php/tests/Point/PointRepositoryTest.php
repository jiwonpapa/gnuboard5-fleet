<?php

declare(strict_types=1);

namespace Tests\Point;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Point\Repository\PointMaintenanceRepository;
use Api\Point\Repository\PointMutationRepository;
use Api\Point\Repository\PointQueryRepository;
use Api\Point\Repository\PointRepository;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class PointRepositoryTest extends TestCase
{
    public function testGrantInsertsPointAndUpdatesMember(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(5))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['lock_state' => 1]),
                $this->createResult(false),
                $this->createResult(['mb_point' => 50]),
                $this->createResult(['cf_point_term' => 0]),
                $this->createResult(['released' => 1])
            );
        $qb->expects($this->once())->method('beginTransaction');
        $qb->expects($this->exactly(2))->method('executeStatement');
        $qb->expects($this->once())->method('commit');
        $qb->expects($this->never())->method('rollback');

        $repository = $this->createRepository($qb);
        $repository->grant('user1', 100, '자유게시판 10 글쓰기', 'free', '10', '쓰기');
    }

    public function testRevokeReturnsFalseWhenOriginPointMissing(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(3))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['lock_state' => 1]),
                $this->createResult(false),
                $this->createResult(['released' => 1])
            );
        $qb->expects($this->never())->method('executeStatement');

        $repository = $this->createRepository($qb);
        $result = $repository->revoke('user1', 'free', '10', '쓰기', '글삭제회수', '자유게시판 10 글삭제');

        $this->assertFalse($result);
    }

    public function testExistsReturnsTrueWhenPointRowFound(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult(['po_id' => 9]));

        $repository = $this->createRepository($qb);
        $this->assertTrue($repository->exists('user1', 'free', '10', '쓰기'));
    }

    public function testGrantReturnsConflictWhenMemberLockTimesOut(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult(['lock_state' => 0]));
        $qb->expects($this->never())->method('executeStatement');

        $repository = $this->createRepository($qb);

        $this->expectException(\Api\Support\Exception\ApiException::class);
        $repository->grant('user1', 100, '자유게시판 10 글쓰기', 'free', '10', '쓰기');
    }

    public function testSyncTotalUpdatesMemberPointSum(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult(['sum_point' => 77]));
        $qb->expects($this->once())
            ->method('executeStatement')
            ->with(
                $this->stringContains('UPDATE g5_member'),
                ['mb_id' => 'user1', 'mb_point' => 77]
            );

        $repository = $this->createRepository($qb);
        $repository->syncTotal('user1');
    }

    public function testDeleteRecalculatesMemberTotalInsideTheMutationTransaction(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(4))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['lock_state' => 1]),
                $this->createResult(['po_id' => 9]),
                $this->createResult(['sum_point' => 31]),
                $this->createResult(['released' => 1])
            );
        $qb->expects($this->once())->method('beginTransaction');
        $qb->expects($this->exactly(2))
            ->method('executeStatement')
            ->willReturnCallback(static function (string $sql, array $params): int {
                if (str_contains($sql, 'UPDATE g5_member')) {
                    self::assertSame(['mb_id' => 'user1', 'mb_point' => 31], $params);
                }

                return 1;
            });
        $qb->expects($this->once())->method('commit');
        $qb->expects($this->never())->method('rollback');

        $repository = $this->createRepository($qb);
        $repository->deleteById(9, 'user1');
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

    private function createRepository(QueryBuilder $qb): PointRepository
    {
        $tables = new TableRegistry('g5_');
        $queryRepository = new PointQueryRepository($qb, $tables);
        $mutationRepository = new PointMutationRepository($queryRepository, $qb, $tables);
        $maintenanceRepository = new PointMaintenanceRepository($queryRepository, $qb, $tables);

        return new PointRepository($queryRepository, $mutationRepository, $maintenanceRepository);
    }
}
