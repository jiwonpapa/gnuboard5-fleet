<?php

declare(strict_types=1);

namespace Tests\Core\DTO;

use Api\Core\DTO\PaginatedResult;
use Api\Core\DTO\PaginationDTO;
use Api\Core\DTO\PointDTO;
use PHPUnit\Framework\TestCase;

final class PaginatedResultTest extends TestCase
{
    public function testJsonSerializeNormalizesItemAndPagination(): void
    {
        $result = new PaginatedResult(
            items: [
                new PointDTO(
                    poId: 1,
                    mbId: 'user1',
                    poContent: '적립',
                    poPoint: 100,
                    poUsePoint: 0,
                    poExpireDate: '9999-12-31',
                    poDatetime: '2026-03-05 00:00:00'
                ),
            ],
            pagination: PaginationDTO::create(1, 1, 20)
        );

        $payload = $result->jsonSerialize();
        $this->assertCount(1, $payload['data']);
        $this->assertSame(1, $payload['data'][0]['po_id']);
        $this->assertSame(1, $payload['pagination']['last_page']);
    }
}
