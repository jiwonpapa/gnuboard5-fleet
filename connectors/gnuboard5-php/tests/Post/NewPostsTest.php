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

final class NewPostsTest extends TestCase
{
    use BuildsDomainServices;

    public function testListNewPostsUsesConfigDefaultRows(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->once())
            ->method('getConfig')
            ->willReturn(['cf_new_rows' => 7]);

        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('getNewPosts')
            ->with(1, 7, null, null, null)
            ->willReturn([
                'items' => [
                    ['bn_id' => 1],
                ],
                'total' => 11,
            ]);

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $this->createMock(PointRewardGateway::class)
        );

        $result = $service->listNewPosts([]);

        $this->assertCount(1, $result['items']);
        $this->assertSame(1, $result['pagination']['page']);
        $this->assertSame(7, $result['pagination']['per_page']);
        $this->assertSame(11, $result['pagination']['total']);
        $this->assertSame(2, $result['pagination']['last_page']);
    }

    public function testListNewPostsSupportsCursorPagination(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->once())
            ->method('getConfig')
            ->willReturn(['cf_new_rows' => 7]);

        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('getNewPostsByCursor')
            ->with(7, 'cursor-token', null, null, null)
            ->willReturn(new \Api\Core\DTO\CursorPaginatedResult(
                items: [
                    new \Api\Core\DTO\NewPostDTO(
                        bnId: 1,
                        boTable: 'free',
                        boSubject: '자유게시판',
                        grId: '',
                        grSubject: '',
                        wrId: 77,
                        wrParent: 77,
                        bnDatetime: '2026-03-06T10:00:00+09:00',
                        mbId: 'writer',
                        viewType: 'w',
                        wrSubject: '글제목',
                        wrName: '작성자',
                        wrDatetime: '2026-03-06T10:00:00+09:00',
                        postMbId: 'writer',
                        parentWrSubject: '',
                        postExists: true
                    ),
                ],
                pagination: new \Api\Core\DTO\CursorPaginationDTO(
                    perPage: 7,
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

        $result = $service->listNewPosts(['cursor' => 'cursor-token']);

        $this->assertSame('cursor', $result['pagination']['mode']);
        $this->assertSame('next-token', $result['pagination']['next_cursor']);
        $this->assertCount(1, $result['items']);
    }

    public function testListNewPostsRejectsInvalidView(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->once())
            ->method('getConfig')
            ->willReturn(['cf_new_rows' => 10]);

        $service = $this->createPostService(
            $this->createMock(PostGateway::class),
            new BoardService($boardGateway),
            $boardGateway,
            $this->createMock(PointRewardGateway::class)
        );

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('view 값은 w 또는 c만 허용됩니다.');

        $service->listNewPosts(['view' => 'x']);
    }

    public function testDeleteNewPostsRequiresSuperAdmin(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $service = $this->createPostService(
            $this->createMock(PostGateway::class),
            new BoardService($boardGateway),
            $boardGateway,
            $this->createMock(PointRewardGateway::class)
        );

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('최고관리자 권한이 필요합니다.');

        $service->deleteNewPosts([
            'mb_id' => 'admin',
            'mb_level' => 9,
        ], [1]);
    }

    public function testDeleteNewPostsCallsGatewayWithSanitizedIds(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('findNewPostTargets')
            ->with([1, 2, 3])
            ->willReturn([]);
        $postGateway->expects($this->once())
            ->method('deleteNewPosts')
            ->with([1, 2, 3]);

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $this->createMock(PointRewardGateway::class)
        );

        $result = $service->deleteNewPosts([
            'mb_id' => 'admin',
            'mb_level' => 10,
        ], [1, '2', 'x', 3, 0, 2]);

        $this->assertTrue($result['deleted']);
        $this->assertSame(0, $result['deleted_count']);
        $this->assertSame(0, $result['deleted_posts']);
        $this->assertSame(0, $result['deleted_comments']);
        $this->assertSame(0, $result['skipped']);
        $this->assertSame([1, 2, 3], $result['bn_ids']);
    }

    public function testDeleteNewPostsDelegatesRootPostDeletion(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_count_delete' => 0,
                'bo_subject' => '자유게시판',
                'gr_use_access' => 0,
                'bo_admin' => '',
                'gr_admin' => '',
            ]);

        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('findNewPostTargets')
            ->with([1])
            ->willReturn([
                [
                    'bn_id' => 1,
                    'bo_table' => 'free',
                    'wr_id' => 10,
                    'wr_parent' => 10,
                ],
            ]);
        $postGateway->expects($this->once())
            ->method('getPost')
            ->with('free', 10)
            ->willReturn([
                'wr_id' => 10,
                'mb_id' => 'writer',
            ]);
        $postGateway->expects($this->once())
            ->method('listCommentsForPost')
            ->with('free', 10)
            ->willReturn([]);
        $postGateway->expects($this->once())
            ->method('deletePost')
            ->with('free', 10);
        $postGateway->expects($this->once())
            ->method('deleteNewPosts')
            ->with([1]);

        $pointGateway = $this->createMock(PointRewardGateway::class);
        $pointGateway->expects($this->once())
            ->method('revoke')
            ->with('writer', 'free', '10', '쓰기', '글삭제회수', '자유게시판 10 글삭제');

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $pointGateway
        );

        $result = $service->deleteNewPosts([
            'mb_id' => 'admin',
            'mb_level' => 10,
        ], [1]);

        $this->assertTrue($result['deleted']);
        $this->assertSame(1, $result['deleted_count']);
        $this->assertSame(1, $result['deleted_posts']);
        $this->assertSame(0, $result['deleted_comments']);
        $this->assertSame(0, $result['skipped']);
        $this->assertSame([1], $result['bn_ids']);
    }

    public function testDeleteNewPostsRejectsEmptyIds(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->never())->method('deleteNewPosts');

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $this->createMock(PointRewardGateway::class)
        );

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('bn_ids는 1개 이상의 정수 배열이어야 합니다.');

        $service->deleteNewPosts([
            'mb_id' => 'admin',
            'mb_level' => 10,
        ], ['x', 0, -1]);
    }
}
