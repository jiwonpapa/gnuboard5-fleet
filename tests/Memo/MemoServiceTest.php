<?php

declare(strict_types=1);

namespace Tests\Memo;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\CursorPaginationDTO;
use Api\Core\DTO\MemoItemDTO;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Memo\Contracts\MemoGateway;
use Api\Memo\Service\MemoService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class MemoServiceTest extends TestCase
{
    public function testSendRejectsWhenSenderIsPrivateAndNotAdmin(): void
    {
        $memoGateway = $this->createMock(MemoGateway::class);
        $pointGateway = $this->createMock(PointRewardGateway::class);
        $service = new MemoService($memoGateway, $pointGateway);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('정보를 공개하지 않으면 쪽지를 보낼 수 없습니다.');

        $service->send([
            'mb_id' => 'sender',
            'mb_level' => 2,
            'mb_open' => 0,
        ], [
            'me_recv_mb_id' => 'user1',
            'me_memo' => 'hello',
        ], '127.0.0.1');
    }

    public function testSendDispatchesToMultipleRecipientsAndDeductsPoint(): void
    {
        $memoGateway = $this->createMock(MemoGateway::class);
        $memoGateway->method('validateRecipient')
            ->willReturnCallback(static fn (string $id): array => ['mb_id' => $id, 'mb_nick' => '닉-' . $id]);
        $memoGateway->method('getMemoSendPoint')->willReturn(10);
        $memoGateway->expects($this->exactly(2))
            ->method('send')
            ->willReturnOnConsecutiveCalls(11, 12);
        $memoGateway->expects($this->exactly(2))->method('updateMemoCall');
        $memoGateway->expects($this->exactly(2))->method('updateMemoCount');

        $pointCalls = [];
        $pointGateway = $this->createMock(PointRewardGateway::class);
        $pointGateway->expects($this->exactly(2))
            ->method('grant')
            ->willReturnCallback(
                static function (
                    string $memberId,
                    int $point,
                    string $content,
                    string $relTable,
                    string $relId,
                    string $relAction,
                    ?int $expireDays = null
                ) use (&$pointCalls): void {
                    $pointCalls[] = [$memberId, $point, $content, $relTable, $relId, $relAction, $expireDays];
                }
            );

        $service = new MemoService($memoGateway, $pointGateway);
        $result = $service->send([
            'mb_id' => 'sender',
            'mb_level' => 2,
            'mb_open' => 1,
            'mb_point' => 100,
        ], [
            'me_recv_mb_id' => 'user1, user2',
            'me_memo' => '<b>Hello</b>',
        ], '127.0.0.1');

        $this->assertSame(2, $result['sent_count']);
        $this->assertSame(['user1', 'user2'], $result['recipients']);
        $this->assertCount(2, $pointCalls);
        $this->assertSame(['sender', -10, '닉-user1(user1)님께 쪽지 발송', '@memo', 'user1', '11', null], $pointCalls[0]);
        $this->assertSame(['sender', -10, '닉-user2(user2)님께 쪽지 발송', '@memo', 'user2', '12', null], $pointCalls[1]);
    }

    public function testDetailMarksRecvMemoAsRead(): void
    {
        $memoGateway = $this->createMock(MemoGateway::class);
        $memoGateway->expects($this->exactly(2))
            ->method('getById')
            ->with(7, 'user1', 'recv')
            ->willReturnOnConsecutiveCalls(
                [
                    'me_id' => 7,
                    'me_read_datetime' => '0000-00-00 00:00:00',
                    'me_memo' => 'before',
                ],
                [
                    'me_id' => 7,
                    'me_read_datetime' => '2026-03-05 10:00:00',
                    'me_memo' => 'after',
                ]
            );
        $memoGateway->expects($this->once())->method('markAsRead')->with(7, 'user1');
        $memoGateway->expects($this->once())->method('updateMemoCount')->with('user1');

        $service = new MemoService($memoGateway, $this->createMock(PointRewardGateway::class));
        $memo = $service->detail(['mb_id' => 'user1'], 7, 'recv');

        $this->assertSame('2026-03-05 10:00:00', $memo['me_read_datetime']);
    }

    public function testDeleteUnreadMemoClearsCallAndUpdatesCount(): void
    {
        $memoGateway = $this->createMock(MemoGateway::class);
        $memoGateway->expects($this->once())
            ->method('delete')
            ->with(9, 'user1')
            ->willReturn([
                'me_id' => 9,
                'me_recv_mb_id' => 'user1',
                'me_send_mb_id' => 'sender',
                'me_read_datetime' => '0000-00-00 00:00:00',
            ]);
        $memoGateway->expects($this->once())->method('clearMemoCall')->with('user1', 'sender');
        $memoGateway->expects($this->once())->method('updateMemoCount')->with('user1');

        $service = new MemoService($memoGateway, $this->createMock(PointRewardGateway::class));
        $result = $service->delete(['mb_id' => 'user1'], 9);

        $this->assertTrue($result['deleted']);
        $this->assertSame(9, $result['me_id']);
    }

    public function testDeleteTreatsSentinelDatetimeAsUnread(): void
    {
        $memoGateway = $this->createMock(MemoGateway::class);
        $memoGateway->expects($this->once())
            ->method('delete')
            ->with(10, 'user1')
            ->willReturn([
                'me_id' => 10,
                'me_recv_mb_id' => 'user1',
                'me_send_mb_id' => 'sender',
                'me_read_datetime' => '1000-01-01 00:00:00',
            ]);
        $memoGateway->expects($this->once())->method('clearMemoCall')->with('user1', 'sender');
        $memoGateway->expects($this->once())->method('updateMemoCount')->with('user1');

        $service = new MemoService($memoGateway, $this->createMock(PointRewardGateway::class));
        $result = $service->delete(['mb_id' => 'user1'], 10);

        $this->assertTrue($result['deleted']);
        $this->assertSame(10, $result['me_id']);
    }

    public function testUnreadCountReturnsGatewayCount(): void
    {
        $memoGateway = $this->createMock(MemoGateway::class);
        $memoGateway->expects($this->once())->method('countUnread')->with('user1')->willReturn(3);

        $service = new MemoService($memoGateway, $this->createMock(PointRewardGateway::class));
        $result = $service->unreadCount(['mb_id' => 'user1']);

        $this->assertSame(3, $result['unread_count']);
    }

    public function testListSupportsCursorPagination(): void
    {
        $memoGateway = $this->createMock(MemoGateway::class);
        $memoGateway->expects($this->once())
            ->method('getListByCursor')
            ->with('user1', 'recv', 2, 'cursor-token')
            ->willReturn(new CursorPaginatedResult(
                items: [
                    new MemoItemDTO(
                        meId: 7,
                        meRecvMbId: 'user1',
                        meSendMbId: 'sender',
                        meSendDatetime: '2026-03-05T10:00:00+09:00',
                        meReadDatetime: null,
                        meMemo: 'hello',
                        meSendId: 0,
                        meType: 'recv',
                        meSendIp: '127.0.0.1',
                        counterpartMbId: 'sender',
                        counterpartMbNick: '발신자'
                    ),
                ],
                pagination: CursorPaginationDTO::create(2, 'cursor-token', 'next-token', true)
            ));

        $service = new MemoService($memoGateway, $this->createMock(PointRewardGateway::class));
        $result = $service->list(['mb_id' => 'user1'], [
            'kind' => 'recv',
            'per_page' => 2,
            'cursor' => 'cursor-token',
        ]);

        $this->assertSame('cursor', $result['pagination']['mode']);
        $this->assertSame('next-token', $result['pagination']['next_cursor']);
        $this->assertCount(1, $result['items']);
    }
}
