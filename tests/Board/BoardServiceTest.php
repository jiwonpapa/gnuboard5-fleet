<?php

declare(strict_types=1);

namespace Tests\Board;

use Api\Board\Service\BoardService;
use Api\Integration\Contracts\BoardGateway;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class BoardServiceTest extends TestCase
{
    public function testListBoardsRejectsInvalidGroupId(): void
    {
        $gateway = $this->createMock(BoardGateway::class);
        $gateway->expects($this->never())->method('listBoards');

        $service = new BoardService($gateway);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('group_id 형식이 올바르지 않습니다.');

        $service->listBoards('bad-group!', 2);
    }

    public function testGetBoardReturnsNormalizedDetail(): void
    {
        $gateway = $this->createMock(BoardGateway::class);
        $gateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'bo_table' => 'free',
                'bo_subject' => '자유게시판',
                'gr_id' => 'group1',
                'bo_admin' => 'boardadmin',
                'gr_admin' => 'groupadmin',
                'gr_use_access' => 1,
                'bo_read_level' => 1,
                'bo_write_level' => 2,
                'bo_reply_level' => 2,
                'bo_comment_level' => 2,
                'bo_use_category' => 1,
                'bo_category_list' => '공지|일반',
                'bo_count_delete' => 1,
                'bo_count_write' => 0,
                'bo_count_comment' => 1,
                'bo_use_secret' => 0,
                'bo_use_dhtml_editor' => 1,
                'bo_upload_count' => 2,
                'bo_upload_size' => 1048576,
                'bo_list_level' => 1,
                'bo_download_level' => 2,
                'bo_read_point' => 0,
                'bo_write_point' => 10,
                'bo_comment_point' => 3,
                'bo_download_point' => -20,
            ]);

        $service = new BoardService($gateway);
        $detail = $service->getBoard('free');

        $this->assertSame('free', $detail['bo_table']);
        $this->assertSame('자유게시판', $detail['bo_subject']);
        $this->assertSame(2, $detail['bo_write_level']);
        $this->assertSame(-20, $detail['bo_download_point']);
    }

    public function testAssertGroupAccessRejectsNonMember(): void
    {
        $gateway = $this->createMock(BoardGateway::class);
        $gateway->expects($this->once())
            ->method('isGroupMember')
            ->with('group1', 'member1')
            ->willReturn(false);

        $service = new BoardService($gateway);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('그룹 접근 권한이 없습니다.');

        $service->assertGroupAccess(
            ['mb_id' => 'member1', 'mb_level' => 2],
            ['gr_use_access' => 1, 'gr_id' => 'group1', 'gr_admin' => '', 'bo_admin' => '']
        );
    }

    public function testIsMemberAllowedForReadAllowsGroupAdminWithoutMembershipLookup(): void
    {
        $gateway = $this->createMock(BoardGateway::class);
        $gateway->expects($this->once())
            ->method('findBoard')
            ->with('free')
            ->willReturn([
                'gr_use_access' => 1,
                'gr_id' => 'group1',
                'gr_admin' => 'leader',
                'bo_admin' => '',
                'bo_read_level' => 2,
            ]);
        $gateway->expects($this->never())->method('isGroupMember');

        $service = new BoardService($gateway);

        $allowed = $service->isMemberAllowedForRead(
            ['mb_id' => 'leader', 'mb_level' => 2],
            'free'
        );

        $this->assertTrue($allowed);
    }
}
