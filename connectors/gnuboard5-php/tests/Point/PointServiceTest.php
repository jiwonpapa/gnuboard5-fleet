<?php

declare(strict_types=1);

namespace Tests\Point;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\CursorPaginationDTO;
use Api\Core\DTO\PaginatedResult;
use Api\Core\DTO\PaginationDTO;
use Api\Core\DTO\PointDTO;
use Api\Point\Contracts\PointQueryGateway;
use Api\Point\Service\PointService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class PointServiceTest extends TestCase
{
    public function testGetMyPointHistoryReturnsPaginationAndItems(): void
    {
        $gateway = $this->createMock(PointQueryGateway::class);
        $gateway->expects($this->once())
            ->method('getPointHistory')
            ->with('user1', 1, 2)
            ->willReturn(new PaginatedResult(
                items: [
                    new PointDTO(
                        poId: 10,
                        mbId: 'user1',
                        poContent: '게시글 작성',
                        poPoint: 100,
                        poUsePoint: 0,
                        poExpireDate: '9999-12-31',
                        poDatetime: '2026-03-04 10:00:00'
                    ),
                    new PointDTO(
                        poId: 9,
                        mbId: 'user1',
                        poContent: '댓글 작성',
                        poPoint: -50,
                        poUsePoint: 0,
                        poExpireDate: '9999-12-31',
                        poDatetime: '2026-03-03 09:00:00'
                    ),
                ],
                pagination: PaginationDTO::create(2, 1, 2)
            ));

        $service = new PointService($gateway);
        $result = $service->getMyPointHistory(['mb_id' => 'user1'], 1, 2);

        $this->assertCount(2, $result['items']);
        $this->assertSame(2, $result['pagination']['total']);
        $this->assertSame(1, $result['pagination']['page']);
        $this->assertSame(1, $result['pagination']['last_page']);
        $this->assertFalse($result['pagination']['has_next']);
        $this->assertFalse($result['pagination']['has_prev']);
    }

    public function testGetMyPointHistoryUnauthorizedWhenMemberMissing(): void
    {
        $gateway = $this->createMock(PointQueryGateway::class);
        $gateway->expects($this->never())->method('getPointHistory');

        $this->expectException(ApiException::class);
        (new PointService($gateway))->getMyPointHistory([], 1, 20);
    }

    public function testGetMyPointHistorySupportsCursorPagination(): void
    {
        $gateway = $this->createMock(PointQueryGateway::class);
        $gateway->expects($this->once())
            ->method('getPointHistoryByCursor')
            ->with('user1', 2, 'cursor-token')
            ->willReturn(new CursorPaginatedResult(
                items: [
                    new PointDTO(
                        poId: 10,
                        mbId: 'user1',
                        poContent: '게시글 작성',
                        poPoint: 100,
                        poUsePoint: 0,
                        poExpireDate: '9999-12-31',
                        poDatetime: '2026-03-04 10:00:00'
                    ),
                ],
                pagination: CursorPaginationDTO::create(2, 'cursor-token', 'next-token', true)
            ));

        $service = new PointService($gateway);
        $result = $service->getMyPointHistory(['mb_id' => 'user1'], 1, 2, 'cursor-token');

        $this->assertSame('cursor', $result['pagination']['mode']);
        $this->assertSame('next-token', $result['pagination']['next_cursor']);
        $this->assertCount(1, $result['items']);
    }
}
