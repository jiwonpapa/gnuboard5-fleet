<?php

declare(strict_types=1);

namespace Tests\Admin\Sms;

use Api\Admin\Sms\Repository\AdminSmsRepository;
use Api\Admin\Sms\Service\AdminSmsConfigService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminSmsConfigServiceTest extends TestCase
{
    public function testUpdateConfigRejectsInvalidCallbackPhone(): void
    {
        $service = new AdminSmsConfigService($this->createMock(AdminSmsRepository::class));

        $this->expectException(ApiException::class);
        $service->updateConfig(['cf_phone' => '123']);
    }

    public function testUpdateConfigRejectsEmptyServerPort(): void
    {
        $service = new AdminSmsConfigService($this->createMock(AdminSmsRepository::class));

        $this->expectException(ApiException::class);
        $service->updateConfig(['cf_icode_server_port' => '']);
    }

    public function testSyncMembersRequiresIcodeMode(): void
    {
        $repository = $this->createMock(AdminSmsRepository::class);
        $repository->method('getConfig')->willReturn(['cf_sms_use' => '']);

        $service = new AdminSmsConfigService($repository);

        $this->expectException(ApiException::class);
        $service->syncMembers();
    }
}
