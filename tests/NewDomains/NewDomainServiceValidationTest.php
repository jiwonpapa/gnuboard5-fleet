<?php

declare(strict_types=1);

namespace Tests\NewDomains;

use Api\Admin\Layout\Repository\AdminLayoutRepository;
use Api\Admin\Layout\Service\AdminLayoutService;
use Api\Admin\Push\Repository\AdminPushRepository;
use Api\Admin\Push\Service\AdminPushService;
use Api\Admin\Report\Repository\AdminReportRepository;
use Api\Admin\Report\Service\AdminReportService;
use Api\Block\Repository\BlockRepository;
use Api\Block\Service\BlockService;
use Api\Device\Repository\DeviceRepository;
use Api\Device\Service\DeviceService;
use Api\Layout\Repository\LayoutRepository;
use Api\Layout\Service\LayoutService;
use Api\Notification\Repository\NotificationRepository;
use Api\Notification\Service\NotificationService;
use Api\Report\Repository\ReportRepository;
use Api\Report\Service\ReportService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class NewDomainServiceValidationTest extends TestCase
{
    public function testDeviceRegisterRequiresAuthentication(): void
    {
        $service = new DeviceService(new DeviceRepository());

        $this->expectException(ApiException::class);
        $service->register([], ['token' => 'abc', 'platform' => 'fcm']);
    }

    public function testDeviceRegisterRejectsInvalidPlatform(): void
    {
        $service = new DeviceService(new DeviceRepository());

        $this->expectException(ApiException::class);
        $service->register(['mb_id' => 'user1'], ['token' => 'abc', 'platform' => 'webpush']);
    }

    public function testNotificationUpdateSettingsRejectsEmptyPayload(): void
    {
        $service = new NotificationService(new NotificationRepository());

        $this->expectException(ApiException::class);
        $service->updateSettings(['mb_id' => 'user1'], []);
    }

    public function testLayoutGetLayoutRejectsInvalidPageId(): void
    {
        $service = new LayoutService(new LayoutRepository());

        $this->expectException(ApiException::class);
        $service->getLayout('invalid page id!');
    }

    public function testReportCreateRejectsInvalidTargetType(): void
    {
        $service = new ReportService(new ReportRepository());

        $this->expectException(ApiException::class);
        $service->create(
            ['mb_id' => 'user1'],
            ['target_type' => 'article', 'target_id' => '10', 'reason' => 'spam']
        );
    }

    public function testBlockRejectsSelfBlock(): void
    {
        $service = new BlockService(new BlockRepository());

        $this->expectException(ApiException::class);
        $service->block(['mb_id' => 'user1'], ['blocked_mb_id' => 'user1']);
    }

    public function testAdminPushSendRejectsWhenNoTargetIsProvided(): void
    {
        $service = new AdminPushService(new AdminPushRepository());

        $this->expectException(ApiException::class);
        $service->send(
            [
                'title' => '공지',
                'body' => '본문',
                'type' => 'manual',
            ],
            'admin'
        );
    }

    public function testAdminLayoutDetailRejectsInvalidPageId(): void
    {
        $service = new AdminLayoutService(new AdminLayoutRepository());

        $this->expectException(ApiException::class);
        $service->detail('invalid page id!');
    }

    public function testAdminReportUpdateRejectsInvalidReportId(): void
    {
        $service = new AdminReportService(new AdminReportRepository());

        $this->expectException(ApiException::class);
        $service->update(0, ['status' => 'approved']);
    }
}
