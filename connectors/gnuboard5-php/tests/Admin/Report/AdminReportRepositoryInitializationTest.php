<?php

/**
 * 관리자 신고 조회 전에 API 확장 테이블을 준비하는 회귀 테스트.
 *
 * @package  Tests\Admin\Report
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Tests\Admin\Report;

use Api\Admin\Report\Repository\AdminReportQueryRepository;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class AdminReportRepositoryInitializationTest extends TestCase
{
    public function testStatsEnsuresReportTableBeforeQueryingFreshInstallation(): void
    {
        $queryBuilder = $this->createMock(QueryBuilder::class);
        $queryBuilder
            ->expects(self::once())
            ->method('executeStatement')
            ->with(self::stringContains('CREATE TABLE IF NOT EXISTS g5_report'))
            ->willReturn(0);

        $result = $this->createMock(Result::class);
        $result->method('fetchAllAssociative')->willReturn([]);
        $queryBuilder
            ->expects(self::once())
            ->method('executeQuery')
            ->with(self::stringContains('GROUP BY rp_status'))
            ->willReturn($result);

        $repository = new AdminReportQueryRepository($queryBuilder, new TableRegistry('g5_'));

        self::assertSame([
            'pending' => 0,
            'approved' => 0,
            'rejected' => 0,
            'hold' => 0,
            'total' => 0,
        ], $repository->stats());
    }
}
