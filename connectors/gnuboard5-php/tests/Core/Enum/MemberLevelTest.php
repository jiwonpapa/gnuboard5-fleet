<?php

declare(strict_types=1);

namespace Tests\Core\Enum;

use Api\Core\Enum\MemberLevel;
use PHPUnit\Framework\TestCase;

final class MemberLevelTest extends TestCase
{
    public function testFromNumericAndAdminCheck(): void
    {
        $this->assertSame(MemberLevel::Guest, MemberLevel::fromNumeric(0));
        $this->assertSame(MemberLevel::Normal, MemberLevel::fromNumeric(1));
        $this->assertSame(MemberLevel::Certified, MemberLevel::fromNumeric(3));
        $this->assertSame(MemberLevel::Admin, MemberLevel::fromNumeric(10));
        $this->assertTrue(MemberLevel::fromNumeric(15)->isAdmin());
    }

    public function testIsAtLeast(): void
    {
        $this->assertTrue(MemberLevel::Admin->isAtLeast(MemberLevel::Normal));
        $this->assertFalse(MemberLevel::Normal->isAtLeast(MemberLevel::Certified));
    }
}
