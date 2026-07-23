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

final class PostServiceBoardRuleTest extends TestCase
{
    use BuildsDomainServices;

    public function testDeletePostBlocksWhenRepliesExist(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_count_delete' => 0,
                'gr_use_access' => 0,
                'bo_admin' => '',
                'gr_admin' => '',
            ]);

        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('getPost')
            ->with('free', 10)
            ->willReturn([
                'wr_id' => 10,
                'mb_id' => 'writer',
            ]);
        $postGateway->expects($this->once())
            ->method('countReplies')
            ->with('free', 10)
            ->willReturn(1);
        $postGateway->expects($this->never())->method('deletePost');
        $pointGateway = $this->createMock(PointRewardGateway::class);

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $pointGateway
        );

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('답변글이 존재하므로 삭제할 수 없습니다.');

        $service->deletePost('free', 10, [
            'mb_id' => 'writer',
            'mb_level' => 2,
        ]);
    }

    public function testCreateReplyRejectsNoticePost(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_reply_level' => 1,
                'bo_use_secret' => 0,
                'gr_use_access' => 0,
                'bo_admin' => '',
                'gr_admin' => '',
            ]);

        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('getPost')
            ->with('free', 10)
            ->willReturn([
                'wr_id' => 10,
                'is_notice' => true,
                'mb_id' => 'author',
            ]);
        $postGateway->expects($this->never())->method('createReply');
        $pointGateway = $this->createMock(PointRewardGateway::class);

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $pointGateway
        );

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('공지글에는 답변할 수 없습니다.');

        $service->createReply('free', 10, [
            'mb_id' => 'user1',
            'mb_level' => 2,
        ], [
            'wr_subject' => 'reply',
            'wr_content' => 'content',
        ], '127.0.0.1');
    }

    public function testGetPostAppliesReadPointWhenConfigured(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_read_level' => 0,
                'bo_read_point' => -5,
                'bo_use_secret' => 0,
                'bo_subject' => '자유게시판',
                'gr_use_access' => 0,
                'bo_admin' => '',
                'gr_admin' => '',
            ]);

        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('getPost')
            ->with('free', 3)
            ->willReturn([
                'wr_id' => 3,
                'mb_id' => 'author',
                'wr_option' => '',
            ]);
        $pointGateway = $this->createMock(PointRewardGateway::class);
        $pointGateway->expects($this->once())
            ->method('grant')
            ->with('reader', -5, '자유게시판 3 글읽기', 'free', '3', '읽기');

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $pointGateway
        );

        $service->getPost('free', 3, [
            'mb_id' => 'reader',
            'mb_level' => 2,
        ]);
    }

    public function testOpenLinkNormalizesUrlWithoutScheme(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->expects($this->exactly(2))
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_read_level' => 1,
                'bo_use_secret' => 0,
                'gr_use_access' => 0,
                'bo_admin' => '',
                'gr_admin' => '',
            ]);

        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('getPost')
            ->with('free', 9)
            ->willReturn([
                'wr_id' => 9,
                'mb_id' => 'author',
                'wr_option' => '',
            ]);
        $postGateway->expects($this->once())
            ->method('increaseLinkHit')
            ->with('free', 9, 1)
            ->willReturn('example.com/path');
        $pointGateway = $this->createMock(PointRewardGateway::class);

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $pointGateway
        );

        $url = $service->openLink('free', 9, 1, [
            'mb_id' => 'reader',
            'mb_level' => 2,
        ]);

        $this->assertSame('http://example.com/path', $url);
    }
}
