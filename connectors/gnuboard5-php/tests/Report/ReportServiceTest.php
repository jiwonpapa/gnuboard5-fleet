<?php

declare(strict_types=1);

namespace Tests\Report;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Report\Repository\ReportRepository;
use Api\Report\Service\ReportService;
use Api\Support\Exception\ApiException;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class ReportServiceTest extends TestCase
{
    public function testCreateRequiresAuthentication(): void
    {
        $service = new ReportService($this->createRepository($this->createMock(QueryBuilder::class)));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('인증 토큰이 필요합니다.');

        $service->create([], [
            'target_type' => 'post',
            'target_id' => '10',
            'reason' => 'spam',
        ]);
    }

    public function testCreateRejectsInvalidReason(): void
    {
        $service = new ReportService($this->createRepository($this->createMock(QueryBuilder::class)));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('reason이 올바르지 않습니다.');

        $service->create(['mb_id' => 'member1'], [
            'target_type' => 'post',
            'target_id' => '10',
            'reason' => 'invalid',
        ]);
    }

    public function testCreateRejectsDuplicateReport(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeStatement')
            ->willReturn(0);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult(['rp_id' => 99]));

        $service = new ReportService($this->createRepository($qb));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('이미 동일 대상에 대한 신고가 접수되어 있습니다.');

        $service->create(['mb_id' => 'member1'], [
            'target_type' => 'post',
            'target_id' => '10',
            'reason' => 'spam',
        ]);
    }

    public function testCreateReturnsNormalizedPayload(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeStatement')
            ->willReturnOnConsecutiveCalls(0, 1);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(false),
                $this->createResult([
                    'rp_id' => 12,
                    'mb_id' => 'member1',
                    'rp_target_type' => 'post',
                    'rp_target_id' => '10',
                    'rp_reason' => 'spam',
                    'rp_detail' => '광고',
                    'rp_status' => 'pending',
                    'rp_datetime' => '2026-03-06 12:50:00',
                ])
            );
        $qb->expects($this->once())
            ->method('lastInsertId')
            ->willReturn(12);

        $service = new ReportService($this->createRepository($qb));
        $result = $service->create(['mb_id' => 'member1'], [
            'target_type' => 'post',
            'target_id' => '10',
            'reason' => 'spam',
            'detail' => '광고',
        ]);

        $this->assertSame(12, $result['report_id']);
        $this->assertSame('post', $result['target_type']);
        $this->assertSame('pending', $result['status']);
    }

    private function createRepository(QueryBuilder $qb): ReportRepository
    {
        return new ReportRepository($qb, new TableRegistry('g5_'));
    }

    private function createResult(array|false $assoc): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);

        return $result;
    }
}
