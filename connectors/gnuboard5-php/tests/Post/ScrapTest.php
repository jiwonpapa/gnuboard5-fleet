<?php

declare(strict_types=1);

namespace Tests\Post;

use Api\Board\Service\BoardService;
use Api\Integration\Contracts\BoardGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Post\Contracts\PostGateway;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;
use Tests\Support\BuildsDomainServices;

final class ScrapTest extends TestCase
{
    use BuildsDomainServices;

    public function testAddScrapSuccess(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_read_level' => 1,
                'gr_use_access' => 0,
                'bo_admin' => '',
                'gr_admin' => '',
            ]);

        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('getPost')
            ->with('free', 11)
            ->willReturn([
                'wr_id' => 11,
                'mb_id' => 'writer',
            ]);
        $postGateway->expects($this->once())
            ->method('isScraped')
            ->with('user1', 'free', 11)
            ->willReturn(false);
        $postGateway->expects($this->once())
            ->method('addScrap')
            ->with('user1', 'free', 11)
            ->willReturn(77);

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $this->createMock(PointRewardGateway::class)
        );

        $result = $service->addScrap('free', 11, [
            'mb_id' => 'user1',
            'mb_level' => 2,
        ]);

        $this->assertSame(77, $result['ms_id']);
        $this->assertSame('free', $result['bo_table']);
        $this->assertSame(11, $result['wr_id']);
        $this->assertTrue($result['scraped']);
    }

    public function testAddScrapRejectsDuplicate(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_read_level' => 1,
                'gr_use_access' => 0,
                'bo_admin' => '',
                'gr_admin' => '',
            ]);

        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('getPost')
            ->with('free', 11)
            ->willReturn([
                'wr_id' => 11,
                'mb_id' => 'writer',
            ]);
        $postGateway->expects($this->once())
            ->method('isScraped')
            ->with('user1', 'free', 11)
            ->willReturn(true);
        $postGateway->expects($this->never())->method('addScrap');

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $this->createMock(PointRewardGateway::class)
        );

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('이미 스크랩한 게시글입니다.');

        $service->addScrap('free', 11, [
            'mb_id' => 'user1',
            'mb_level' => 2,
        ]);
    }

    public function testRemoveScrapRequiresExistingRow(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('isScraped')
            ->with('user1', 'free', 11)
            ->willReturn(false);
        $postGateway->expects($this->never())->method('removeScrap');

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $this->createMock(PointRewardGateway::class)
        );

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('스크랩 내역을 찾을 수 없습니다.');

        $service->removeScrap('free', 11, [
            'mb_id' => 'user1',
            'mb_level' => 2,
        ]);
    }

    public function testListMyScrapsReturnsPagination(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('getScrapList')
            ->with('user1', 2, 10)
            ->willReturn([
                'items' => [
                    ['ms_id' => 101],
                ],
                'total' => 25,
            ]);

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $this->createMock(PointRewardGateway::class)
        );

        $result = $service->listMyScraps([
            'mb_id' => 'user1',
            'mb_level' => 2,
        ], 2, 10);

        $this->assertCount(1, $result['items']);
        $this->assertSame(2, $result['pagination']['page']);
        $this->assertSame(10, $result['pagination']['per_page']);
        $this->assertSame(25, $result['pagination']['total']);
        $this->assertSame(3, $result['pagination']['last_page']);
        $this->assertTrue($result['pagination']['has_next']);
        $this->assertTrue($result['pagination']['has_prev']);
    }

    public function testListMyScrapsSupportsCursorPagination(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('getScrapListByCursor')
            ->with('user1', 2, 'cursor-token')
            ->willReturn(new \Api\Core\DTO\CursorPaginatedResult(
                items: [
                    new \Api\Core\DTO\PostScrapDTO(
                        msId: 101,
                        boTable: 'free',
                        boSubject: '자유게시판',
                        wrId: 77,
                        wrSubject: '글제목',
                        wrName: '작성자',
                        wrDatetime: '2026-03-06T10:00:00+09:00',
                        mbId: 'writer',
                        msDatetime: '2026-03-06T10:10:00+09:00',
                        postExists: true
                    ),
                ],
                pagination: new \Api\Core\DTO\CursorPaginationDTO(
                    perPage: 2,
                    cursor: 'cursor-token',
                    nextCursor: 'next-token',
                    hasNext: true
                )
            ));

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $this->createMock(PointRewardGateway::class)
        );

        $result = $service->listMyScraps([
            'mb_id' => 'user1',
            'mb_level' => 2,
        ], 1, 2, 'cursor-token');

        $this->assertSame('cursor', $result['pagination']['mode']);
        $this->assertSame('next-token', $result['pagination']['next_cursor']);
        $this->assertCount(1, $result['items']);
    }
}
