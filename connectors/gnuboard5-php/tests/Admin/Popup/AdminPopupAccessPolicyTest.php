<?php

declare(strict_types=1);

namespace Tests\Admin\Popup;

use Api\Admin\Popup\Service\Support\AdminPopupAccessPolicy;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminPopupAccessPolicyTest extends TestCase
{
    public function testAssertSuperAdminRejectsNonAdmin(): void
    {
        $policy = new AdminPopupAccessPolicy();

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('최고관리자만 접근할 수 있습니다.');

        $policy->assertSuperAdmin([
            'mb_level' => 2,
        ]);
    }
}
