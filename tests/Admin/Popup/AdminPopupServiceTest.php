<?php

declare(strict_types=1);

namespace Tests\Admin\Popup;

use Api\Admin\Popup\Repository\AdminPopupRepository;
use Api\Admin\Popup\Service\AdminPopupService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminPopupServiceTest extends TestCase
{
    public function testCreateRequiresSubject(): void
    {
        $service = new AdminPopupService($this->createMock(AdminPopupRepository::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('nw_subject는 필수입니다.');

        $service->createAdmin([
            'mb_level' => 10,
            'mb_id' => 'super',
        ], [
            'nw_content' => '본문',
        ]);
    }

    public function testActiveUsesNormalizedFilters(): void
    {
        $repository = $this->createMock(AdminPopupRepository::class);
        $repository->expects($this->once())
            ->method('listActive')
            ->with(
                $this->isType('string'),
                'mobile',
                'comm'
            )
            ->willReturn([
                [
                    'nw_id' => 1,
                    'nw_subject' => '팝업',
                ],
            ]);

        $service = new AdminPopupService($repository);
        $result = $service->active([
            'device' => 'mobile',
            'division' => 'comm',
        ]);

        $this->assertSame('mobile', $result['device']);
        $this->assertSame('comm', $result['division']);
        $this->assertCount(1, $result['items']);
    }
}
