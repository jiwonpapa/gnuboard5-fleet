<?php

declare(strict_types=1);

namespace Tests\Post;

use Api\Board\Service\BoardService;
use Api\Core\Plugin\EventDispatcher;
use Api\Integration\Contracts\BoardGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Post\Contracts\PostGateway;
use PHPUnit\Framework\TestCase;
use Tests\Support\BuildsDomainServices;

final class PostEventDispatchTest extends TestCase
{
    use BuildsDomainServices;

    public function testCreatePostDispatchesCreatingCreatedAndPointEvents(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->method('findBoard')->willReturn([
            'bo_table' => 'free',
            'bo_subject' => '자유게시판',
            'bo_write_level' => 1,
            'bo_write_point' => 5,
            'gr_use_access' => 0,
            'bo_admin' => '',
            'gr_admin' => '',
        ]);
        $boardGateway->method('getConfig')->willReturn(['cf_delay_sec' => 0]);

        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->method('getLastWriteTime')->willReturn(null);
        $postGateway->expects($this->once())
            ->method('createPost')
            ->with(
                'free',
                ['mb_id' => 'writer', 'mb_level' => 2],
                '변경된 제목',
                '내용',
                null,
                null,
                false,
                '127.0.0.1',
                null,
                null
            )
            ->willReturn(101);

        $pointGateway = $this->createMock(PointRewardGateway::class);
        $pointGateway->expects($this->once())
            ->method('grant')
            ->with('writer', 5, '자유게시판 101 글쓰기', 'free', '101', '쓰기');

        $events = new EventDispatcher();
        $created = [];
        $pointAdded = [];
        $events->listen('post.creating', static function (array $payload): array {
            $payload['data']['subject'] = '변경된 제목';

            return $payload;
        });
        $events->listen('post.created', static function (array $payload) use (&$created): array {
            $created = $payload;

            return $payload;
        });
        $events->listen('point.added', static function (array $payload) use (&$pointAdded): array {
            $pointAdded = $payload;

            return $payload;
        });

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $pointGateway,
            $events
        );

        $postId = $service->createPost('free', ['mb_id' => 'writer', 'mb_level' => 2], [
            'wr_subject' => '원래 제목',
            'wr_content' => '내용',
        ], '127.0.0.1');

        $this->assertSame(101, $postId);
        $this->assertSame(101, $created['post_id'] ?? null);
        $this->assertSame('변경된 제목', $created['data']['subject'] ?? null);
        $this->assertSame(5, $pointAdded['amount'] ?? null);
    }

    public function testUpdateAndDeleteDispatchEvents(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->method('findBoard')->willReturn([
            'bo_table' => 'free',
            'bo_subject' => '자유게시판',
            'bo_write_level' => 1,
            'bo_count_delete' => 0,
            'gr_use_access' => 0,
            'bo_admin' => '',
            'gr_admin' => '',
        ]);

        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->method('getPost')->willReturn([
            'wr_id' => 77,
            'mb_id' => 'writer',
        ]);
        $postGateway->expects($this->once())->method('updatePost');
        $postGateway->method('countReplies')->willReturn(0);
        $postGateway->method('listCommentsForPost')->willReturn([]);
        $postGateway->expects($this->once())->method('deletePost')->with('free', 77);

        $pointGateway = $this->createMock(PointRewardGateway::class);
        $pointGateway->expects($this->once())->method('revoke');

        $events = new EventDispatcher();
        $updated = [];
        $deleted = [];
        $events->listen('post.updated', static function (array $payload) use (&$updated): array {
            $updated = $payload;

            return $payload;
        });
        $events->listen('post.deleted', static function (array $payload) use (&$deleted): array {
            $deleted = $payload;

            return $payload;
        });

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $pointGateway,
            $events
        );

        $service->updatePost('free', 77, ['mb_id' => 'writer', 'mb_level' => 2], [
            'wr_subject' => '수정 제목',
        ]);
        $service->deletePost('free', 77, ['mb_id' => 'writer', 'mb_level' => 2]);

        $this->assertSame(77, $updated['post_id'] ?? null);
        $this->assertSame(['wr_subject'], $updated['changed_fields'] ?? null);
        $this->assertSame(77, $deleted['post_id'] ?? null);
    }
}
