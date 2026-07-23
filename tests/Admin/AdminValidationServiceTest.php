<?php

declare(strict_types=1);

namespace Tests\Admin;

use Api\Admin\Board\Repository\AdminBoardRepository;
use Api\Admin\Board\Service\AdminBoardService;
use Api\Admin\Config\Repository\AdminConfigRepository;
use Api\Admin\Config\Service\AdminConfigService;
use Api\Admin\Content\Repository\AdminContentRepository;
use Api\Admin\Content\Service\AdminContentService;
use Api\Admin\Faq\Repository\AdminFaqRepository;
use Api\Admin\Faq\Repository\AdminFaqMasterRepository;
use Api\Admin\Faq\Service\AdminFaqMasterService;
use Api\Admin\Faq\Service\AdminFaqService;
use Api\Admin\Group\Repository\AdminGroupRepository;
use Api\Admin\Group\Service\AdminGroupService;
use Api\Admin\Layout\Repository\AdminLayoutRepository;
use Api\Admin\Layout\Service\AdminLayoutService;
use Api\Admin\Menu\Repository\AdminMenuRepository;
use Api\Admin\Menu\Service\AdminMenuService;
use Api\Admin\Point\Repository\AdminPointRepository;
use Api\Admin\Point\Service\AdminPointService;
use Api\Admin\Push\Repository\AdminPushRepository;
use Api\Admin\Push\Service\AdminPushService;
use Api\Admin\Report\Repository\AdminReportRepository;
use Api\Admin\Report\Service\AdminReportService;
use Api\Admin\Visit\Repository\AdminVisitLogRepository;
use Api\Admin\Visit\Repository\AdminVisitRepository;
use Api\Admin\Visit\Repository\AdminVisitStatsRepository;
use Api\Admin\Visit\Service\AdminVisitService;
use Api\Admin\WriteCount\Repository\AdminWriteCountRepository;
use Api\Admin\WriteCount\Service\AdminWriteCountService;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Integration\Contracts\PointMaintenanceGateway;
use Api\Integration\Contracts\PointQueryGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminValidationServiceTest extends TestCase
{
    public function testBoardCreateRequiresSubject(): void
    {
        $this->expectException(ApiException::class);

        $service = new AdminBoardService(new AdminBoardRepository());
        $service->create([
            'bo_table' => 'notice',
            'gr_id' => 'community',
        ]);
    }

    public function testGroupDetailRejectsInvalidGroupIdFormat(): void
    {
        $this->expectException(ApiException::class);

        $service = new AdminGroupService(new AdminGroupRepository());
        $service->detail('invalid-group-id-too-long');
    }

    public function testPointGrantRequiresPositivePoint(): void
    {
        $this->expectException(ApiException::class);

        $service = new AdminPointService(
            new AdminPointRepository(),
            $this->createMock(PointQueryGateway::class),
            $this->createMock(PointRewardGateway::class),
            $this->createMock(PointMaintenanceGateway::class)
        );
        $service->grant([
            'mb_id' => 'user01',
            'point' => 0,
        ], 'admin');
    }

    public function testConfigUpdateRejectsBlankAdminId(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('최고관리자 회원아이디가 존재하지 않습니다.');

        $service = $this->createConfigService();
        $service->update([
            'cf_admin' => '   ',
        ]);
    }

    public function testConfigUpdateRejectsBlankRequiredIntegerField(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('cf_point_term 값은 비워둘 수 없습니다.');

        $service = $this->createConfigService();
        $service->update([
            'cf_point_term' => '   ',
        ]);
    }

    public function testConfigUpdateRejectsNonNumericIntegerField(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('cf_write_pages 값은 정수만 입력할 수 있습니다.');

        $service = $this->createConfigService();
        $service->update([
            'cf_write_pages' => '12a',
        ]);
    }

    public function testConfigUpdateRequiresAtLeastOneCertificationMethodWhenEnabled(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage(
            '본인확인을 위해 아이핀, 휴대폰 본인확인, KG이니시스 간편인증 서비스 중 하나 이상 선택해 주십시오.'
        );

        $service = $this->createConfigService([
            'cf_cert_use' => 0,
            'cf_cert_ipin' => '',
            'cf_cert_hp' => '',
            'cf_cert_simple' => '',
        ]);
        $service->update([
            'cf_cert_use' => '1',
            'cf_cert_ipin' => '0',
            'cf_cert_hp' => '0',
            'cf_cert_simple' => '',
        ]);
    }

    public function testContentCreateRejectsInvalidContentId(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('co_id 형식이 올바르지 않습니다.');

        $service = new AdminContentService(new AdminContentRepository());
        $service->create([
            'co_id' => 'bad-id!',
            'co_subject' => '제목',
            'co_content' => '내용',
        ]);
    }

    public function testFaqListRejectsNonPositiveMasterId(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('fm_id는 양수여야 합니다.');

        $service = new AdminFaqService(
            new AdminFaqRepository(),
            new AdminFaqMasterService(new AdminFaqMasterRepository())
        );
        $service->list([
            'fm_id' => 0,
        ]);
    }

    public function testMenuReorderRejectsEmptyOrders(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('orders 배열이 필요합니다.');

        $service = new AdminMenuService(new AdminMenuRepository());
        $service->reorder([
            'orders' => [],
        ]);
    }

    public function testMenuCreateRequiresCode(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('me_code는 필수입니다.');

        $service = new AdminMenuService(new AdminMenuRepository());
        $service->create([
            'me_name' => '메뉴 이름',
            'me_link' => '/shop',
        ]);
    }

    public function testVisitStatsRejectsInvalidType(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('type은 date/hour/week/month/year/browser/os/device/domain/search 중 하나여야 합니다.');

        $service = $this->createVisitService();
        $service->stats([
            'type' => 'invalid',
        ]);
    }

    public function testVisitStatsRejectsInvalidDateFormat(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('date_from는 YYYY-MM-DD 형식이어야 합니다.');

        $service = $this->createVisitService();
        $service->stats([
            'date_from' => '0100-11-26',
        ]);
    }

    public function testVisitStatsRejectsReversedDateRange(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('date_from은 date_to보다 이후일 수 없습니다.');

        $service = $this->createVisitService();
        $service->stats([
            'date_from' => '2026-03-09',
            'date_to' => '2026-03-08',
        ]);
    }

    public function testVisitDeleteRejectsInvalidBeforeDate(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('before는 YYYY-MM-DD 형식이어야 합니다.');

        $service = $this->createVisitService();
        $service->delete([
            'before' => '2026-99-99',
        ]);
    }

    public function testPushSendRejectsMissingTargets(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('발송 대상이 없습니다.');

        $service = new AdminPushService(new AdminPushRepository());
        $service->send([
            'title' => '공지',
            'body' => '본문',
        ], 'admin');
    }

    public function testReportListRejectsInvalidStatus(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('status 값이 올바르지 않습니다.');

        $service = new AdminReportService(new AdminReportRepository());
        $service->list([
            'status' => 'invalid',
        ]);
    }

    public function testLayoutSaveRequiresWidgetsArray(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('widgets 배열이 필요합니다.');

        $service = new AdminLayoutService(new AdminLayoutRepository());
        $service->save('home', [
            'title' => '홈',
            'widgets' => 'invalid',
        ]);
    }

    public function testLayoutUpdateWidgetRejectsUnsupportedType(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('지원하지 않는 widget type 입니다.');

        $service = new AdminLayoutService(new AdminLayoutRepository());
        $service->updateWidget('home', 'hero-banner', [
            'type' => 'unsupported',
        ]);
    }

    public function testWriteCountRejectsInvalidPeriod(): void
    {
        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('period는 hour/day/week/month/year 중 하나여야 합니다.');

        $service = new AdminWriteCountService(new AdminWriteCountRepository());
        $service->stats([
            'period' => 'quarter',
        ]);
    }

    private function createVisitService(): AdminVisitService
    {
        $qb = new QueryBuilder(new \PDO('sqlite::memory:'));
        $tables = new TableRegistry('g5_');

        return new AdminVisitService(
            new AdminVisitRepository(
                new AdminVisitStatsRepository($qb, $tables),
                new AdminVisitLogRepository($qb, $tables)
            )
        );
    }

    /**
     * @param array<string, mixed> $currentConfig
     */
    private function createConfigService(array $currentConfig = []): AdminConfigService
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')->willReturn(
            $this->createDbalResult($currentConfig === [] ? ['cf_cert_use' => 0] : $currentConfig)
        );

        return new AdminConfigService(new AdminConfigRepository($qb, new TableRegistry('g5_')));
    }

    /**
     * @param array<string, mixed>|false $first
     * @param list<array<string, mixed>> $rows
     */
    private function createDbalResult(array|false $first, array $rows = []): \Doctrine\DBAL\Result
    {
        $result = $this->createMock(\Doctrine\DBAL\Result::class);
        $result->method('fetchAssociative')->willReturn($first);
        $result->method('fetchAllAssociative')->willReturn($rows);

        return $result;
    }
}
