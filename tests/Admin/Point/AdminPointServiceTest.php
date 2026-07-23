<?php

declare(strict_types=1);

namespace Tests\Admin\Point;

use Api\Admin\Point\Repository\AdminPointRepository;
use Api\Admin\Point\Service\AdminPointService;
use Api\Admin\Point\Service\Support\AdminPointInputNormalizer;
use Api\Admin\Point\Service\Support\AdminPointPresenter;
use Api\Admin\Point\Service\Support\AdminPointResultBuilder;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Integration\Contracts\PointMaintenanceGateway;
use Api\Integration\Contracts\PointQueryGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class AdminPointServiceTest extends TestCase
{
    public function testActorRelationIdFitsLegacyTwentyCharacterColumnAndStaysUnique(): void
    {
        $builder = new AdminPointResultBuilder();
        $first = $builder->actorRelId('administrator-account');
        $second = $builder->actorRelId('administrator-account');

        self::assertLessThanOrEqual(20, strlen($first));
        self::assertStringStartsWith('administ-', $first);
        self::assertNotSame($first, $second);
    }

    public function testGrantReturnsBeforeAndAfterPointSummary(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['mb_id' => 'neo1', 'mb_point' => 120]),
                $this->createResult(['mb_id' => 'neo1', 'mb_point' => 170])
            );

        $repository = $this->createRepository($qb);

        $rewardGateway = $this->createMock(PointRewardGateway::class);
        $rewardGateway->expects($this->once())
            ->method('grant')
            ->with(
                'neo1',
                50,
                '관리자 수동 지급',
                '@admin',
                $this->isString(),
                'super'
            );

        $service = new AdminPointService(
            $repository,
            $this->createMock(PointQueryGateway::class),
            $rewardGateway,
            $this->createMock(PointMaintenanceGateway::class)
        );
        $result = $service->grant([
            'mb_id' => 'neo1',
            'point' => 50,
        ], 'super');

        $this->assertSame('neo1', $result['mb_id']);
        $this->assertSame(120, $result['before_point']);
        $this->assertSame(50, $result['changed_point']);
        $this->assertSame(170, $result['after_point']);
    }

    public function testDeleteCountsOnlyExistingPointRows(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(3))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['po_id' => 11, 'mb_id' => 'neo1']),
                $this->createResult(false),
                $this->createResult(['po_id' => 13, 'mb_id' => 'neo2'])
            );

        $repository = $this->createRepository($qb);

        $maintenanceGateway = $this->createMock(PointMaintenanceGateway::class);
        $maintenanceGateway->expects($this->exactly(2))
            ->method('deleteById')
            ->willReturnCallback(static function (int $poId, string $memberId): void {
                self::assertContains($poId, [11, 13]);
                self::assertContains($memberId, ['neo1', 'neo2']);
            });

        $service = new AdminPointService(
            $repository,
            $this->createMock(PointQueryGateway::class),
            $this->createMock(PointRewardGateway::class),
            $maintenanceGateway
        );
        $result = $service->delete([
            'po_ids' => [11, 12, 13],
        ]);

        $this->assertSame(3, $result['requested_count']);
        $this->assertSame(2, $result['deleted_count']);
    }

    public function testSummaryPassesMemberIdToGateway(): void
    {
        $repository = $this->createRepository($this->createMock(QueryBuilder::class));
        $queryGateway = $this->createMock(PointQueryGateway::class);
        $queryGateway->expects($this->once())
            ->method('getSummary')
            ->with('neo1')
            ->willReturn([
                'mb_id' => 'neo1',
                'total_point' => 700,
                'total_rows' => 14,
            ]);

        $service = new AdminPointService(
            $repository,
            $queryGateway,
            $this->createMock(PointRewardGateway::class),
            $this->createMock(PointMaintenanceGateway::class)
        );
        $result = $service->summary([
            'mb_id' => 'neo1',
        ]);

        $this->assertSame('neo1', $result['mb_id']);
        $this->assertSame(700, $result['total_point']);
        $this->assertSame(14, $result['total_rows']);
    }

    public function testExpireDelegatesBaseDateToGateway(): void
    {
        $repository = $this->createRepository($this->createMock(QueryBuilder::class));
        $maintenanceGateway = $this->createMock(PointMaintenanceGateway::class);
        $maintenanceGateway->expects($this->once())
            ->method('expirePoints')
            ->with('2026-03-08')
            ->willReturn([
                'base_date' => '2026-03-08',
                'expired_count' => 4,
                'synced_members' => 2,
            ]);

        $service = new AdminPointService(
            $repository,
            $this->createMock(PointQueryGateway::class),
            $this->createMock(PointRewardGateway::class),
            $maintenanceGateway
        );
        $result = $service->expire([
            'base_date' => '2026-03-08',
        ]);

        $this->assertSame('2026-03-08', $result['base_date']);
        $this->assertSame(4, $result['expired_count']);
        $this->assertSame(2, $result['synced_members']);
    }

    public function testListBuildsPagination(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['cnt' => 21]),
                $this->createResult(false, [
                    ['po_id' => 1, 'mb_id' => 'neo1', 'po_point' => 10],
                    ['po_id' => 2, 'mb_id' => 'neo2', 'po_point' => 20],
                ])
            );

        $service = new AdminPointService(
            $this->createRepository($qb),
            $this->createMock(PointQueryGateway::class),
            $this->createMock(PointRewardGateway::class),
            $this->createMock(PointMaintenanceGateway::class)
        );
        $result = $service->list([
            'page' => 2,
            'per_page' => 10,
            'mb_id' => 'neo1',
            'search_field' => 'po_content',
            'search' => '관리자',
        ]);

        $this->assertSame(21, $result['pagination']['total']);
        $this->assertSame(3, $result['pagination']['last_page']);
        $this->assertCount(2, $result['items']);
    }

    public function testDeductReturnsNegativeChangeSummary(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['mb_id' => 'neo1', 'mb_point' => 120]),
                $this->createResult(['mb_id' => 'neo1', 'mb_point' => 90])
            );

        $rewardGateway = $this->createMock(PointRewardGateway::class);
        $rewardGateway->expects($this->once())
            ->method('grant')
            ->with(
                'neo1',
                -30,
                '관리자 수동 차감',
                '@admin',
                $this->isString(),
                'super'
            );

        $service = new AdminPointService(
            $this->createRepository($qb),
            $this->createMock(PointQueryGateway::class),
            $rewardGateway,
            $this->createMock(PointMaintenanceGateway::class)
        );
        $result = $service->deduct([
            'mb_id' => 'neo1',
            'point' => 30,
        ], 'super');

        $this->assertSame(-30, $result['changed_point']);
        $this->assertSame(90, $result['after_point']);
    }

    public function testPointChangeRejectsUndeclaredField(): void
    {
        $this->expectException(\Api\Support\Exception\ApiException::class);
        $this->expectExceptionMessage('허용되지 않은 필드가 있습니다: po_rel_table');

        (new AdminPointInputNormalizer())->pointChange([
            'mb_id' => 'neo1',
            'point' => 10,
            'po_rel_table' => 'manual-injection',
        ], '관리자 수동 지급');
    }

    public function testPointIdsRejectNumericStrings(): void
    {
        $this->expectException(\Api\Support\Exception\ApiException::class);
        $this->expectExceptionMessage('po_ids에는 1 이상의 정수만 허용됩니다.');

        (new AdminPointInputNormalizer())->deletion(['po_ids' => ['11']]);
    }

    public function testExpirationRejectsInvalidCalendarDate(): void
    {
        $this->expectException(\Api\Support\Exception\ApiException::class);
        $this->expectExceptionMessage('유효한 YYYY-MM-DD 날짜');

        (new AdminPointInputNormalizer())->expiration(['base_date' => '2026-02-30']);
    }

    public function testPresenterPublishesAllLedgerColumnsWithContractTypes(): void
    {
        $item = AdminPointPresenter::item([
            'po_id' => '1',
            'mb_id' => 'neo1',
            'po_datetime' => '2026-03-08T10:00:00+09:00',
            'po_content' => '지급',
            'po_point' => '50',
            'po_use_point' => '0',
            'po_expired' => '0',
            'po_expire_date' => '9999-12-31',
            'po_mb_point' => '170',
            'po_rel_table' => '@admin',
            'po_rel_id' => 'super-1',
            'po_rel_action' => 'super',
            'internal' => 'not exposed',
        ]);

        $this->assertCount(12, $item);
        $this->assertSame(1, $item['po_id']);
        $this->assertSame(50, $item['po_point']);
        $this->assertSame(0, $item['po_expired']);
        $this->assertArrayNotHasKey('internal', $item);
    }

    /**
     * @param array<string, mixed>|false $assoc
     */
    private function createResult(array|false $assoc, array $all = []): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);
        $result->method('fetchAllAssociative')->willReturn($all);

        return $result;
    }

    private function createRepository(QueryBuilder $qb): AdminPointRepository
    {
        return new AdminPointRepository($qb, new TableRegistry('g5_'));
    }
}
