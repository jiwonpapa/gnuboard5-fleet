<?php

declare(strict_types=1);

namespace Tests\Core\DTO;

use Api\Core\DTO\PaginationDTO;
use PHPUnit\Framework\TestCase;

final class PaginationDTOTest extends TestCase
{
    public function testCreateHandlesZeroTotal(): void
    {
        $dto = PaginationDTO::create(0, 1, 20);
        $payload = $dto->jsonSerialize();

        $this->assertSame(0, $payload['total']);
        $this->assertSame(1, $payload['last_page']);
        $this->assertFalse($payload['has_next']);
        $this->assertFalse($payload['has_prev']);
    }

    public function testCreateHandlesMiddlePage(): void
    {
        $dto = PaginationDTO::create(50, 2, 10);
        $payload = $dto->jsonSerialize();

        $this->assertSame(5, $payload['last_page']);
        $this->assertTrue($payload['has_next']);
        $this->assertTrue($payload['has_prev']);
    }
}
