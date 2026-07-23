<?php

declare(strict_types=1);

namespace Tests\Admin\Poll;

use Api\Admin\Poll\Service\Support\AdminPollAccessPolicy;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminPollAccessPolicyTest extends TestCase
{
    public function testAssertSuperAdminRejectsNonAdmin(): void
    {
        $policy = new AdminPollAccessPolicy();

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('최고관리자만 접근할 수 있습니다.');

        $policy->assertSuperAdmin([
            'mb_level' => 2,
        ]);
    }
}
