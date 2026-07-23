<?php

declare(strict_types=1);

namespace Tests\Core\Enum;

use Api\Core\Enum\VoteType;
use PHPUnit\Framework\TestCase;

final class VoteTypeTest extends TestCase
{
    public function testTryFromValidAndInvalid(): void
    {
        $this->assertSame(VoteType::Good, VoteType::tryFrom('good'));
        $this->assertSame(VoteType::NoGood, VoteType::tryFrom('nogood'));
        $this->assertNull(VoteType::tryFrom('invalid'));
    }
}
