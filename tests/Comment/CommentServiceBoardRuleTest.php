<?php

declare(strict_types=1);

namespace Tests\Comment;

use Api\Board\Service\BoardService;
use Api\Comment\Contracts\CommentGateway;
use Api\Comment\Service\CommentService;
use Api\Core\Plugin\EventDispatcher;
use Api\Integration\Contracts\BoardGateway;
use Api\Integration\Contracts\PostReadGateway;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class CommentServiceBoardRuleTest extends TestCase
{
    public function testCreateCommentGrantsPointAndBoardNew(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->exactly(2))
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_comment_level' => 1,
                'bo_comment_point' => 3,
                'bo_subject' => '자유게시판',
                'gr_use_access' => 0,
                'bo_admin' => '',
                'gr_admin' => '',
            ]);

        $postGateway = $this->createMock(PostReadGateway::class);
        $postGateway->expects($this->once())
            ->method('getPost')
            ->with('free', 10)
            ->willReturn([
                'wr_id' => 10,
                'mb_id' => 'author',
            ]);

        $commentGateway = $this->createMock(CommentGateway::class);
        $commentGateway->expects($this->once())
            ->method('createComment')
            ->willReturn(101);
        $commentGateway->expects($this->once())
            ->method('grantCommentPoint')
            ->with('reader', 'free', 10, 101, 3, '자유게시판');
        $commentGateway->expects($this->once())
            ->method('insertBoardNew')
            ->with('free', 101, 10, 'reader');
        $commentGateway->expects($this->once())
            ->method('incrementBoardCommentCount')
            ->with('free');
        $commentGateway->expects($this->once())
            ->method('getComment')
            ->with('free', 101)
            ->willReturn([
                'wr_id' => 101,
                'wr_parent' => 10,
                'mb_id' => 'reader',
                'wr_content' => 'hello',
            ]);

        $service = new CommentService(
            $commentGateway,
            $postGateway,
            new BoardService($boardGateway),
            new EventDispatcher()
        );

        $result = $service->createComment('free', 10, [
            'mb_id' => 'reader',
            'mb_level' => 2,
        ], [
            'wr_content' => 'hello',
        ], '127.0.0.1');

        $this->assertSame(101, (int)($result['wr_id'] ?? 0));
    }

    public function testDeleteCommentBlocksWhenChildCommentExists(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_comment_point' => 1,
                'bo_subject' => '자유게시판',
                'gr_use_access' => 0,
                'bo_admin' => '',
                'gr_admin' => '',
            ]);

        $postGateway = $this->createMock(PostReadGateway::class);
        $commentGateway = $this->createMock(CommentGateway::class);
        $commentGateway->expects($this->once())
            ->method('getComment')
            ->with('free', 55)
            ->willReturn([
                'wr_id' => 55,
                'wr_parent' => 10,
                'mb_id' => 'writer',
            ]);
        $commentGateway->expects($this->once())
            ->method('countChildComments')
            ->with('free', 55)
            ->willReturn(2);
        $commentGateway->expects($this->never())->method('deleteComment');

        $service = new CommentService(
            $commentGateway,
            $postGateway,
            new BoardService($boardGateway),
            new EventDispatcher()
        );

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('답변댓글이 존재하므로 삭제할 수 없습니다.');

        $service->deleteComment('free', 10, 55, [
            'mb_id' => 'writer',
            'mb_level' => 2,
        ]);
    }
}
