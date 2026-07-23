<?php

declare(strict_types=1);

namespace Tests\Comment;

use Api\Board\Service\BoardService;
use Api\Comment\Service\Support\CommentPermissionService;
use Api\Integration\Contracts\BoardGateway;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class CommentPermissionServiceTest extends TestCase
{
    public function testAssertCanCreateRejectsWhenBoardRuleDeniesComment(): void
    {
        $service = new CommentPermissionService($this->boardService([
            'bo_comment_level' => 5,
            'gr_use_access' => 0,
            'bo_admin' => '',
            'gr_admin' => '',
        ]));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('해당 게시판 댓글 작성 권한이 없습니다.');

        $service->assertCanCreate(['mb_level' => 2], 'free');
    }

    public function testAssertCanDeleteRejectsChildCommentsForNonAdmin(): void
    {
        $service = new CommentPermissionService($this->boardService([
            'gr_use_access' => 0,
            'bo_admin' => '',
            'gr_admin' => '',
        ]));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('답변댓글이 존재하므로 삭제할 수 없습니다.');

        $service->assertCanDelete(
            ['mb_id' => 'writer', 'mb_level' => 2],
            ['mb_id' => 'writer'],
            ['bo_admin' => '', 'gr_admin' => '', 'gr_use_access' => 0],
            1
        );
    }

    /**
     * @param array<string,mixed> $boardRow
     */
    private function boardService(array $boardRow): BoardService
    {
        $boardGateway = $this->createMock(BoardGateway::class);
        $boardGateway->method('findBoard')->willReturn(array_merge([
            'bo_table' => 'free',
        ], $boardRow));
        $boardGateway->method('getConfig')->willReturn(['cf_delay_sec' => 0]);

        return new BoardService($boardGateway);
    }
}
