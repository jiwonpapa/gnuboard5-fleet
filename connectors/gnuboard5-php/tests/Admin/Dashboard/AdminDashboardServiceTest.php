<?php

declare(strict_types=1);

namespace Tests\Admin\Dashboard;

use Api\Admin\Dashboard\Repository\AdminDashboardRepository;
use Api\Admin\Dashboard\Service\AdminDashboardService;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Exception\ApiException;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class AdminDashboardServiceTest extends TestCase
{
    public function testOverviewBuildsLegacyDashboardSummary(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(9))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createAssocResult([
                    'total_members' => 12,
                    'blocked_members' => 1,
                    'leave_members' => 2,
                ]),
                $this->createAssocResult(['cnt' => 7]),
                $this->createAssocResult(['cnt' => 11]),
                $this->createAssocResult([
                    'total_visits' => 1234,
                    'active_days' => 30,
                    'first_date' => '2026-02-10',
                    'last_date' => '2026-03-10',
                ]),
                $this->createAssocResult([
                    'total_rows' => 2222,
                    'unique_ips' => 321,
                ]),
                $this->createListResult([
                    [
                        'mb_id' => 'neo1',
                        'mb_name' => '네오',
                        'mb_nick' => '매트릭스',
                        'mb_level' => 10,
                        'mb_point' => 999,
                        'mb_datetime' => '2026-03-10 12:00:00',
                        'mb_mailling' => '1',
                        'mb_open' => '1',
                        'mb_email_certify' => '20260310120000',
                        'mb_intercept_date' => '',
                        'group_count' => 3,
                    ],
                ]),
                $this->createListResult([
                    [
                        'bn_id' => 55,
                        'bo_table' => 'notice',
                        'wr_id' => 100,
                        'wr_parent' => 100,
                        'bn_datetime' => '2026-03-10 12:05:00',
                        'mb_id' => 'neo1',
                        'gr_id' => 'group1',
                        'bo_subject' => '공지사항',
                        'gr_subject' => '기본그룹',
                    ],
                ]),
                $this->createAssocResult([
                    'wr_subject' => '새 공지',
                    'wr_name' => '관리자',
                    'wr_datetime' => '2026-03-10 12:05:00',
                    'mb_id' => 'neo1',
                ]),
                $this->createListResult([
                    [
                        'po_id' => 9,
                        'mb_id' => 'neo1',
                        'mb_name' => '네오',
                        'mb_nick' => '매트릭스',
                        'po_datetime' => '2026-03-10 11:50:00',
                        'po_content' => '관리자 수동 지급',
                        'po_point' => 50,
                        'po_mb_point' => 999,
                        'po_rel_table' => '@admin',
                        'po_rel_id' => 'super-1',
                        'po_rel_action' => 'super',
                    ],
                ])
            );

        $service = new AdminDashboardService(
            new AdminDashboardRepository($qb, new TableRegistry('g5_'))
        );

        $result = $service->overview([
            'limit' => 5,
        ]);

        $this->assertSame(5, $result['limit']);
        $this->assertSame(12, $result['summary']['members']['total_members']);
        $this->assertSame(7, $result['summary']['posts']['total_rows']);
        $this->assertSame(11, $result['summary']['points']['total_rows']);
        $this->assertSame(1234, $result['summary']['visits']['total_visits']);
        $this->assertSame('neo1', $result['recent_members'][0]['mb_id']);
        $this->assertSame(true, $result['recent_members'][0]['email_certified']);
        $this->assertSame('notice', $result['recent_posts'][0]['bo_table']);
        $this->assertSame('새 공지', $result['recent_posts'][0]['wr_subject']);
        $this->assertSame('neo1', $result['recent_points'][0]['mb_id']);
    }

    public function testOverviewRejectsOutOfRangeLimit(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->never())->method('executeQuery');

        $service = new AdminDashboardService(
            new AdminDashboardRepository($qb, new TableRegistry('g5_'))
        );

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('limit은 1 이상 20 이하의 정수여야 합니다.');

        $service->overview([
            'limit' => 0,
        ]);
    }

    /**
     * @param array<string,mixed>|false $assoc
     */
    private function createAssocResult(array|false $assoc): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);
        $result->method('fetchAllAssociative')->willReturn([]);

        return $result;
    }

    /**
     * @param array<int,array<string,mixed>> $rows
     */
    private function createListResult(array $rows): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn(false);
        $result->method('fetchAllAssociative')->willReturn($rows);

        return $result;
    }
}
