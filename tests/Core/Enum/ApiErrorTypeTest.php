<?php

declare(strict_types=1);

namespace Tests\Core\Enum;

use Api\Core\Enum\ApiErrorType;
use PHPUnit\Framework\TestCase;

final class ApiErrorTypeTest extends TestCase
{
    public function testCoreValuesAreStable(): void
    {
        $this->assertSame('/errors/validation', ApiErrorType::Validation->value);
        $this->assertSame('/errors/not-found', ApiErrorType::NotFound->value);
        $this->assertSame('/errors/internal', ApiErrorType::Internal->value);
        $this->assertSame('/errors/too-many-requests', ApiErrorType::TooManyRequests->value);
    }
}
