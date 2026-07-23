<?php

declare(strict_types=1);

namespace Tests\Memo;

use Api\Memo\Service\Support\MemoPolicyService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class MemoPolicyServiceTest extends TestCase
{
    public function testAssertEnoughPointsRejectsWhenBalanceIsTooLow(): void
    {
        $policy = new MemoPolicyService();

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('포인트가 부족합니다.');

        $policy->assertEnoughPoints([
            'mb_point' => 5,
        ], 10, 1, false);
    }

    public function testIsUnreadTreatsSentinelDatetimeAsUnread(): void
    {
        $policy = new MemoPolicyService();

        $this->assertTrue($policy->isUnread([
            'me_read_datetime' => '1000-01-01 00:00:00',
        ]));
        $this->assertFalse($policy->isUnread([
            'me_read_datetime' => '2026-03-13 10:00:00',
        ]));
    }
}
