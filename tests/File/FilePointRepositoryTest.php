<?php

declare(strict_types=1);

namespace Tests\File;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\File\Repository\FilePointRepository;
use Api\Support\Exception\ApiException;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class FilePointRepositoryTest extends TestCase
{
    public function testApplyDownloadPointUsesMemberLockAndTransaction(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects(self::exactly(4))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['lock_state' => 1]),
                $this->createResult(false),
                $this->createResult(['mb_point' => 20]),
                $this->createResult(['released' => 1])
            );
        $qb->expects(self::once())->method('beginTransaction');
        $qb->expects(self::exactly(2))->method('executeStatement');
        $qb->expects(self::once())->method('commit');
        $qb->expects(self::never())->method('rollback');

        $repository = new FilePointRepository($qb, new TableRegistry('g5_'));
        $repository->applyDownloadPoint('reader', 'free', 10, 2, -5, '자유게시판 10 파일 다운로드');
    }

    public function testApplyDownloadPointReturnsWhenPointAlreadyExists(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects(self::exactly(3))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['lock_state' => 1]),
                $this->createResult(['po_id' => 99]),
                $this->createResult(['released' => 1])
            );
        $qb->expects(self::never())->method('beginTransaction');
        $qb->expects(self::never())->method('executeStatement');

        $repository = new FilePointRepository($qb, new TableRegistry('g5_'));
        $repository->applyDownloadPoint('reader', 'free', 10, 2, -5, '자유게시판 10 파일 다운로드');
    }

    public function testApplyDownloadPointRejectsWhenMemberBalanceWouldGoNegative(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects(self::exactly(4))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['lock_state' => 1]),
                $this->createResult(false),
                $this->createResult(['mb_point' => 1]),
                $this->createResult(['released' => 1])
            );
        $qb->expects(self::never())->method('beginTransaction');
        $qb->expects(self::never())->method('executeStatement');

        $repository = new FilePointRepository($qb, new TableRegistry('g5_'));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('다운로드 포인트가 부족합니다.');

        $repository->applyDownloadPoint('reader', 'free', 10, 2, -5, '자유게시판 10 파일 다운로드');
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
