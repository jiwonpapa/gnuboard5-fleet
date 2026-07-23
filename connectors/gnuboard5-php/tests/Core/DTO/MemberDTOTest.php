<?php

declare(strict_types=1);

namespace Tests\Core\DTO;

use Api\Core\DTO\MemberDTO;
use PHPUnit\Framework\TestCase;

final class MemberDTOTest extends TestCase
{
    public function testFromRowAndJsonSerialize(): void
    {
        $dto = MemberDTO::fromRow([
            'mb_id' => 'user1',
            'mb_name' => '홍길동',
            'mb_nick' => '길동',
            'mb_email' => 'user1@example.com',
            'mb_level' => 2,
            'mb_point' => 120,
            'mb_hp' => '01012341234',
            'mb_homepage' => 'https://example.com',
            'mb_today_login' => '2026-03-05 10:00:00',
            'mb_datetime' => '2026-01-01 00:00:00',
            'mb_leave_date' => '',
            'mb_intercept_date' => '',
            'mb_password' => 'hashed',
        ]);

        $this->assertSame('user1', $dto->mbId);
        $this->assertFalse($dto->isAdmin());
        $this->assertTrue($dto->isActive());

        $payload = $dto->jsonSerialize();
        $this->assertArrayNotHasKey('mb_password', $payload);
        $this->assertSame('user1', $payload['mb_id']);
    }

    public function testIsAdminAndInactive(): void
    {
        $dto = MemberDTO::fromRow([
            'mb_id' => 'admin',
            'mb_level' => 10,
            'mb_leave_date' => '20260305',
        ]);

        $this->assertTrue($dto->isAdmin());
        $this->assertFalse($dto->isActive());
    }
}
