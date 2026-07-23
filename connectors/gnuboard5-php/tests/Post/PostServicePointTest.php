<?php

declare(strict_types=1);

namespace Tests\Post;

use Api\Board\Service\BoardService;
use Api\Integration\Contracts\BoardGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Post\Contracts\PostGateway;
use PHPUnit\Framework\TestCase;
use Tests\Support\BuildsDomainServices;

final class PostServicePointTest extends TestCase
{
    use BuildsDomainServices;

    public function testCreatePostGrantsWritePoint(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->method('findBoard')->willReturn([
            'bo_table' => 'free',
            'bo_write_level' => 1,
            'bo_write_point' => 100,
            'bo_subject' => '자유게시판',
            'bo_use_secret' => 0,
            'gr_use_access' => 0,
            'bo_admin' => '',
            'gr_admin' => '',
        ]);
        $boardGateway->method('getConfig')->willReturn(['cf_delay_sec' => 0]);

        $postGateway = $this->createMock(PostGateway::class);
        $postGateway->expects($this->once())
            ->method('createPost')
            ->willReturn(321);

        $pointGateway = $this->createMock(PointRewardGateway::class);
        $pointGateway->expects($this->once())
            ->method('grant')
            ->with('writer', 100, '자유게시판 321 글쓰기', 'free', '321', '쓰기');

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $pointGateway
        );

        $postId = $service->createPost('free', [
            'mb_id' => 'writer',
            'mb_level' => 2,
            'mb_name' => '작성자',
            'mb_email' => 'writer@example.com',
        ], [
            'wr_subject' => '제목',
            'wr_content' => '내용',
        ], '127.0.0.1');

        $this->assertSame(321, $postId);
    }

    public function testDeletePostRevokesWritePointAndCommentPoints(): void
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->method('findBoard')->willReturn([
            'bo_table' => 'free',
            'bo_count_delete' => 0,
            'bo_subject' => '자유게시판',
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
            ->willReturn(0);
        $postGateway->expects($this->once())
            ->method('listCommentsForPost')
            ->with('free', 10)
            ->willReturn([
                ['wr_id' => 101, 'mb_id' => 'reader1'],
                ['wr_id' => 102, 'mb_id' => 'reader2'],
            ]);
        $postGateway->expects($this->once())
            ->method('deletePost')
            ->with('free', 10);

        $revokeCalls = [];
        $pointGateway = $this->createMock(PointRewardGateway::class);
        $pointGateway->expects($this->exactly(3))
            ->method('revoke')
            ->willReturnCallback(
                static function (
                    string $memberId,
                    string $relTable,
                    string $relId,
                    string $originalAction,
                    string $revokeAction,
                    string $revokeContent
                ) use (&$revokeCalls): bool {
                    $revokeCalls[] = [$memberId, $relTable, $relId, $originalAction, $revokeAction, $revokeContent];
                    return true;
                }
            );

        $service = $this->createPostService(
            $postGateway,
            new BoardService($boardGateway),
            $boardGateway,
            $pointGateway
        );

        $service->deletePost('free', 10, [
            'mb_id' => 'writer',
            'mb_level' => 2,
        ]);

        $this->assertSame(
            [
                ['reader1', 'free', '101', '댓글', '댓글삭제회수', '자유게시판 101 댓글삭제'],
                ['reader2', 'free', '102', '댓글', '댓글삭제회수', '자유게시판 102 댓글삭제'],
                ['writer', 'free', '10', '쓰기', '글삭제회수', '자유게시판 10 글삭제'],
            ],
            $revokeCalls
        );
    }
}
