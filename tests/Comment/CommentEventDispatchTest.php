<?php

declare(strict_types=1);

namespace Tests\Comment;

use Api\Board\Service\BoardService;
use Api\Comment\Contracts\CommentGateway;
use Api\Comment\Service\CommentService;
use Api\Core\Plugin\EventDispatcher;
use Api\Integration\Contracts\BoardGateway;
use Api\Integration\Contracts\PostReadGateway;
use PHPUnit\Framework\TestCase;

final class CommentEventDispatchTest extends TestCase
{
    public function testCreateCommentDispatchesCommentAndPointEvents(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->method('findBoard')->willReturn([
            'bo_table' => 'free',
            'bo_comment_level' => 1,
            'bo_comment_point' => 3,
            'bo_subject' => '자유게시판',
            'gr_use_access' => 0,
            'bo_admin' => '',
            'gr_admin' => '',
        ]);
        $boardGateway->method('getConfig')->willReturn(['cf_delay_sec' => 0]);

        $postGateway = $this->createMock(PostReadGateway::class);
        $postGateway->method('getPost')->willReturn([
            'wr_id' => 10,
            'mb_id' => 'author',
        ]);

        $commentGateway = $this->createMock(CommentGateway::class);
        $commentGateway->method('createComment')->willReturn(101);
        $commentGateway->method('getComment')->willReturn([
            'wr_id' => 101,
            'wr_parent' => 10,
            'mb_id' => 'reader',
            'wr_content' => 'hello',
        ]);
        $commentGateway->expects($this->once())->method('grantCommentPoint');
        $commentGateway->expects($this->once())->method('insertBoardNew');
        $commentGateway->expects($this->once())->method('incrementBoardCommentCount');

        $events = new EventDispatcher();
        $commentCreated = [];
        $pointAdded = [];
        $events->listen('comment.created', static function (array $payload) use (&$commentCreated): array {
            $commentCreated = $payload;

            return $payload;
        });
        $events->listen('point.added', static function (array $payload) use (&$pointAdded): array {
            $pointAdded = $payload;

            return $payload;
        });

        $service = new CommentService(
            $commentGateway,
            $postGateway,
            new BoardService($boardGateway),
            $events
        );

        $service->createComment('free', 10, [
            'mb_id' => 'reader',
            'mb_level' => 2,
        ], [
            'wr_content' => 'hello',
        ], '127.0.0.1');

        $this->assertSame(101, $commentCreated['comment_id'] ?? null);
        $this->assertSame(3, $pointAdded['amount'] ?? null);
        $this->assertSame('reader', $pointAdded['member_id'] ?? null);
    }
}
