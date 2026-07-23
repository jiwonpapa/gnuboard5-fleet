<?php

declare(strict_types=1);

namespace Tests\Notification;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\CursorPaginationDTO;
use Api\Core\DTO\NotificationLogDTO;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Notification\Repository\NotificationRepository;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class NotificationRepositoryTest extends TestCase
{
    public function testListLogsReturnsItemsAndTotal(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(
                    false,
                    [
                        [
                            'pl_id' => 11,
                            'mb_id' => 'user1',
                            'pl_title' => '제목',
                            'pl_body' => '본문',
                            'pl_type' => 'memo',
                            'pl_status' => 'sent',
                            'pl_datetime' => '2026-03-05 10:00:00',
                        ],
                    ]
                ),
                $this->createResult(['cnt' => 31])
            );

        $repository = new NotificationRepository($qb, new TableRegistry('g5_'));
        $result = $repository->listLogs('user1', 2, 10);

        $this->assertCount(1, $result['items']);
        $this->assertSame(31, $result['total']);
        $this->assertSame(11, $result['items'][0]['pl_id']);
    }

    public function testGetSettingsReturnsDefaultWhenRowMissing(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult(false));

        $repository = new NotificationRepository($qb, new TableRegistry('g5_'));
        $result = $repository->getSettings('user1');

        $this->assertSame(
            [
                'receive_comment' => true,
                'receive_message' => true,
                'receive_notice' => true,
            ],
            $result
        );
    }

    public function testSaveSettingsPersistsAndReturnsSavedState(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeStatement')
            ->with(
                $this->stringContains('INSERT INTO g5_push_setting'),
                [
                    'mb_id' => 'user1',
                    'ps_receive_comment' => 1,
                    'ps_receive_message' => 0,
                    'ps_receive_notice' => 1,
                    'ps_datetime' => '2026-03-05 18:20:00',
                ]
            );

        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult([
                'ps_receive_comment' => 1,
                'ps_receive_message' => 0,
                'ps_receive_notice' => 1,
            ]));

        $repository = new NotificationRepository($qb, new TableRegistry('g5_'));
        $result = $repository->saveSettings(
            'user1',
            [
                'receive_comment' => true,
                'receive_message' => false,
                'receive_notice' => true,
            ],
            '2026-03-05 18:20:00'
        );

        $this->assertSame(
            [
                'receive_comment' => true,
                'receive_message' => false,
                'receive_notice' => true,
            ],
            $result
        );
    }

    public function testListLogsByCursorReturnsNextCursor(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn(
                $this->createResult(
                    false,
                    [
                        [
                            'pl_id' => 15,
                            'mb_id' => 'user1',
                            'pl_title' => '제목1',
                            'pl_body' => '본문1',
                            'pl_type' => 'memo',
                            'pl_status' => 'sent',
                            'pl_datetime' => '2026-03-05 10:00:00',
                        ],
                        [
                            'pl_id' => 14,
                            'mb_id' => 'user1',
                            'pl_title' => '제목2',
                            'pl_body' => '본문2',
                            'pl_type' => 'memo',
                            'pl_status' => 'sent',
                            'pl_datetime' => '2026-03-05 09:00:00',
                        ],
                        [
                            'pl_id' => 13,
                            'mb_id' => 'user1',
                            'pl_title' => '제목3',
                            'pl_body' => '본문3',
                            'pl_type' => 'memo',
                            'pl_status' => 'sent',
                            'pl_datetime' => '2026-03-05 08:00:00',
                        ],
                    ]
                )
            );

        $repository = new NotificationRepository($qb, new TableRegistry('g5_'));
        $result = $repository->listLogsByCursor('user1', 2, null);

        $this->assertCount(2, $result->items);
        $this->assertTrue($result->pagination->hasNext);
        $this->assertNotNull($result->pagination->nextCursor);
    }

    /**
     * @param array<string, mixed>|false $assoc
     * @param array<int, array<string, mixed>> $all
     */
    private function createResult(array|false $assoc, array $all = []): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);
        $result->method('fetchAllAssociative')->willReturn($all);

        return $result;
    }
}
