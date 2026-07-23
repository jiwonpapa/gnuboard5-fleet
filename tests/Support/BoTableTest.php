<?php

declare(strict_types=1);

namespace Tests\Support;

use Api\Support\Exception\ApiException;
use Api\Support\Validation\BoTable;
use PHPUnit\Framework\TestCase;

final class BoTableTest extends TestCase
{
    public function testNormalizeAcceptsValidTableName(): void
    {
        $this->assertSame('free_bd', BoTable::normalize('free_bd'));
    }

    public function testNormalizeRejectsInvalidTableName(): void
    {
        $this->expectException(ApiException::class);
        BoTable::normalize('bad-table');
    }

    public function testNormalizeRejectsEmptyTableName(): void
    {
        $this->expectException(ApiException::class);
        BoTable::normalize('');
    }
}
