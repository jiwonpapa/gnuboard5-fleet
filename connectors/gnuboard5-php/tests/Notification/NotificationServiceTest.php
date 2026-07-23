<?php

declare(strict_types=1);

namespace Tests\Notification;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Notification\Repository\NotificationRepository;
use Api\Notification\Service\NotificationService;
use Api\Support\Exception\ApiException;
use Api\Support\Pagination\CursorCodec;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class NotificationServiceTest extends TestCase
{
    public function testListMyNotificationsRequiresAuthenticatedMember(): void
    {
        $service = new NotificationService(new NotificationRepository($this->createMock(QueryBuilder::class), new TableRegistry('g5_')));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('인증 토큰이 필요합니다.');

        $service->listMyNotifications([], 1, 20);
    }

    public function testListMyNotificationsUsesPageModeWithSafePagination(): void
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

        $service = new NotificationService(new NotificationRepository($qb, new TableRegistry('g5_')));
        $result = $service->listMyNotifications(['mb_id' => 'user1'], 0, 500);

        $this->assertCount(1, $result['items']);
        $this->assertSame(11, $result['items'][0]['pl_id']);
        $this->assertSame(1, $result['pagination']['page']);
        $this->assertSame(100, $result['pagination']['per_page']);
        $this->assertFalse($result['pagination']['has_next']);
    }

    public function testListMyNotificationsUsesCursorModeWhenCursorIsProvided(): void
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

        $service = new NotificationService(new NotificationRepository($qb, new TableRegistry('g5_')));
        $result = $service->listMyNotifications(
            ['mb_id' => 'user1'],
            1,
            2,
            CursorCodec::encode('notification.logs', 20)
        );

        $this->assertCount(2, $result['items']);
        $this->assertSame('cursor', $result['pagination']['mode']);
        $this->assertTrue($result['pagination']['has_next']);
        $this->assertNotNull($result['pagination']['next_cursor']);
    }

    public function testUpdateSettingsRejectsUnknownKeys(): void
    {
        $service = new NotificationService(new NotificationRepository($this->createMock(QueryBuilder::class), new TableRegistry('g5_')));

        try {
            $service->updateSettings(['mb_id' => 'user1'], ['unknown' => true]);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('허용되지 않는 설정 키가 포함되어 있습니다.', $exception->getMessage());
        }
    }

    public function testUpdateSettingsRejectsInvalidBooleanValues(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult([
                'ps_receive_comment' => 1,
                'ps_receive_message' => 1,
                'ps_receive_notice' => 1,
            ]));

        try {
            $service = new NotificationService(new NotificationRepository($qb, new TableRegistry('g5_')));
            $service->updateSettings(['mb_id' => 'user1'], ['receive_comment' => 'yes']);
            self::fail('ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame('receive_comment은 boolean이어야 합니다.', $exception->getMessage());
        }
    }

    public function testUpdateSettingsMergesDefaultsAndPersistsResolvedBooleans(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult([
                    'ps_receive_comment' => 0,
                    'ps_receive_message' => 1,
                    'ps_receive_notice' => 1,
                ]),
                $this->createResult([
                    'ps_receive_comment' => 1,
                    'ps_receive_message' => 1,
                    'ps_receive_notice' => 0,
                ])
            );
        $qb->expects($this->once())
            ->method('executeStatement')
            ->with(
                $this->stringContains('INSERT INTO g5_push_setting'),
                $this->callback(static function (array $params): bool {
                    return $params['mb_id'] === 'user1'
                        && $params['ps_receive_comment'] === 1
                        && $params['ps_receive_message'] === 1
                        && $params['ps_receive_notice'] === 0;
                })
            )
            ->willReturn(1);

        $service = new NotificationService(new NotificationRepository($qb, new TableRegistry('g5_')));
        $result = $service->updateSettings(['mb_id' => 'user1'], [
            'receive_comment' => true,
            'receive_notice' => 0,
        ]);

        $this->assertSame(
            [
                'receive_comment' => true,
                'receive_message' => true,
                'receive_notice' => false,
            ],
            $result
        );
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
