<?php

declare(strict_types=1);

namespace Tests\Admin\Poll;

use Api\Admin\Poll\Repository\AdminPollRepository;
use Api\Admin\Poll\Service\AdminPollManageService;
use Api\Admin\Poll\Service\AdminPollResultService;
use Api\Admin\Poll\Service\AdminPollService;
use Api\Admin\Poll\Service\AdminPollVoteService;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminPollServiceTest extends TestCase
{
    public function testCreateRequiresAtLeastTwoOptions(): void
    {
        $service = $this->createService(
            $this->createMock(AdminPollRepository::class),
            $this->createMock(PointRewardGateway::class)
        );

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('투표 항목은 최소 2개 이상 필요합니다.');

        $service->createAdmin([
            'mb_level' => 10,
            'mb_id' => 'super',
        ], [
            'po_subject' => '테스트',
            'options' => ['항목1'],
        ]);
    }

    public function testVoteRejectsDuplicateMemberVote(): void
    {
        $repository = $this->createMock(AdminPollRepository::class);
        $repository->expects($this->once())
            ->method('find')
            ->with(3)
            ->willReturn([
                'po_id' => 3,
                'po_subject' => '투표',
                'po_use' => 1,
                'po_level' => 1,
                'po_point' => 10,
                'po_poll1' => 'A',
                'po_poll2' => 'B',
                'po_cnt1' => 1,
                'po_cnt2' => 1,
                'po_etc' => '',
                'po_ips' => '',
                'mb_ids' => 'user1,user2,',
            ]);
        $repository->expects($this->never())->method('recordVote');

        $service = $this->createService($repository, $this->createMock(PointRewardGateway::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('이미 투표에 참여했습니다.');

        $service->vote(3, ['poll_no' => 1], [
            'mb_id' => 'user1',
            'mb_level' => 2,
        ], '127.0.0.1');
    }

    public function testActiveReturnsInactiveWhenNoPoll(): void
    {
        $repository = $this->createMock(AdminPollRepository::class);
        $repository->expects($this->once())
            ->method('findActive')
            ->willReturn(null);

        $service = $this->createService($repository, $this->createMock(PointRewardGateway::class));
        $result = $service->active([]);

        $this->assertFalse($result['active']);
        $this->assertNull($result['poll']);
    }

    public function testActiveReturnsEligiblePollSummary(): void
    {
        $repository = $this->createMock(AdminPollRepository::class);
        $repository->expects($this->once())
            ->method('findActive')
            ->willReturn([
                'po_id' => 4,
                'po_subject' => '활성 투표',
                'po_level' => 2,
                'po_point' => 0,
                'po_use' => 1,
                'po_etc' => '',
                'po_poll1' => '찬성',
                'po_poll2' => '반대',
                'po_cnt1' => 3,
                'po_cnt2' => 1,
            ]);

        $service = $this->createService($repository, $this->createMock(PointRewardGateway::class));
        $result = $service->active([
            'mb_id' => 'neo1',
            'mb_level' => 3,
        ]);

        $this->assertTrue($result['active']);
        $this->assertTrue($result['can_vote']);
        $this->assertSame(4, $result['poll']['total_votes']);
    }

    public function testVoteRecordsVoteIdeaAndPoint(): void
    {
        $repository = $this->createMock(AdminPollRepository::class);
        $repository->expects($this->once())
            ->method('find')
            ->with(7)
            ->willReturn([
                'po_id' => 7,
                'po_subject' => '새 기능',
                'po_use' => 1,
                'po_level' => 2,
                'po_point' => 30,
                'po_poll1' => '찬성',
                'po_poll2' => '반대',
                'po_cnt1' => 0,
                'po_cnt2' => 0,
                'po_etc' => '기타 의견을 입력하세요',
                'po_ips' => '',
                'mb_ids' => '',
            ]);
        $repository->expects($this->once())
            ->method('recordVote')
            ->with(7, 1, '127.0.0.1,', 'neo1,');
        $repository->expects($this->once())
            ->method('addEtcIdea')
            ->with(7, 'neo1', '네오', '기타 의견');

        $pointGateway = $this->createMock(PointRewardGateway::class);
        $pointGateway->expects($this->once())
            ->method('exists')
            ->with('neo1', '@poll', '7', '투표')
            ->willReturn(false);
        $pointGateway->expects($this->once())
            ->method('grant')
            ->with('neo1', 30, '7. 새 기능 투표 참여', '@poll', '7', '투표');

        $service = $this->createService($repository, $pointGateway);
        $result = $service->vote(7, [
            'poll_no' => 1,
            'po_etc_text' => '기타 의견',
        ], [
            'mb_id' => 'neo1',
            'mb_name' => '네오',
            'mb_level' => 3,
        ], '127.0.0.1');

        $this->assertTrue($result['voted']);
        $this->assertSame('찬성', $result['choice']);
    }

    public function testAdminServiceDelegatesManageWrappers(): void
    {
        $repository = $this->createMock(AdminPollRepository::class);
        $repository->expects($this->once())
            ->method('list')
            ->with(2, 10)
            ->willReturn([
                'total' => 11,
                'items' => [['po_id' => 2]],
            ]);
        $repository->expects($this->exactly(5))
            ->method('find')
            ->willReturn([
                'po_id' => 2,
                'po_subject' => '관리 투표',
                'po_date' => '2026-03-10',
                'po_level' => 1,
                'po_point' => 0,
                'po_use' => 1,
                'po_etc' => '',
                'po_poll1' => 'A',
                'po_poll2' => 'B',
                'po_cnt1' => 1,
                'po_cnt2' => 1,
            ]);
        $repository->expects($this->never())
            ->method('listEtc');
        $repository->expects($this->once())
            ->method('create')
            ->willReturn(2);
        $repository->expects($this->once())
            ->method('update')
            ->with(2, ['po_subject' => '관리 투표'])
            ->willReturn(1);
        $repository->expects($this->once())
            ->method('delete')
            ->with(2)
            ->willReturn(1);

        $service = $this->createService($repository, $this->createMock(PointRewardGateway::class));
        $admin = ['mb_level' => 10, 'mb_id' => 'super'];

        $this->assertSame(2, $service->listAdmin($admin, ['page' => 2, 'per_page' => 10])['pagination']['page']);
        $this->assertSame(2, $service->detailAdmin($admin, 2)['po_id']);
        $this->assertSame(2, $service->createAdmin($admin, ['po_subject' => '관리 투표', 'options' => ['A', 'B']])['po_id']);
        $this->assertSame(2, $service->updateAdmin(2, $admin, ['po_subject' => '관리 투표'])['po_id']);
        $this->assertSame(2, $service->result(2)['po_id']);
        $service->deleteAdmin(2, $admin);
        $this->assertTrue(true);
    }

    private function createService(AdminPollRepository $repository, PointRewardGateway $pointGateway): AdminPollService
    {
        $resultService = new AdminPollResultService($repository);

        return new AdminPollService(
            new AdminPollManageService($repository, $resultService),
            new AdminPollVoteService($repository, $pointGateway, $resultService)
        );
    }
}
