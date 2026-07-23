<?php

declare(strict_types=1);

namespace Tests\Admin;

use Api\Admin\Mail\Repository\AdminMailRepository;
use Api\Admin\Mail\Service\AdminMailQueryService;
use Api\Admin\Poll\Repository\AdminPollRepository;
use Api\Admin\Poll\Service\AdminPollManageService;
use Api\Admin\Poll\Service\AdminPollResultService;
use Api\Admin\Popup\Repository\AdminPopupRepository;
use Api\Admin\Popup\Service\AdminPopupService;
use PHPUnit\Framework\TestCase;

final class AdminOpenServiceCoverageTest extends TestCase
{
    public function testMailQueryServiceCoversListDetailDeleteAndRecipients(): void
    {
        $repository = $this->createMock(AdminMailRepository::class);
        $repository->expects(self::once())
            ->method('listTemplates')
            ->with(2, 15)
            ->willReturn([
                'total' => 16,
                'items' => [['ma_id' => 1]],
            ]);
        $repository->expects(self::once())
            ->method('findTemplate')
            ->with(1)
            ->willReturn(['ma_id' => 1, 'ma_subject' => '안내']);
        $repository->expects(self::once())
            ->method('deleteTemplate')
            ->with(1)
            ->willReturn(1);
        $repository->expects(self::once())
            ->method('listRecipients')
            ->with(2, 1000, 'neo', 2, 10, 'group1', 'a', 'z', 'example.com', true)
            ->willReturn([
                'total' => 21,
                'items' => [['mb_id' => 'neo1']],
            ]);

        $service = new AdminMailQueryService($repository);
        $admin = ['mb_level' => 10];

        $listed = $service->listAdmin($admin, ['page' => 2, 'per_page' => 15]);
        self::assertSame(2, $listed['pagination']['page']);
        self::assertSame(2, $listed['pagination']['last_page']);
        self::assertSame(1, $service->detailAdmin($admin, 1)['ma_id']);
        $service->deleteAdmin($admin, 1);

        $recipients = $service->recipients($admin, [
            'page' => 2,
            'per_page' => 2000,
            'search' => 'neo',
            'level_min' => 2,
            'level_max' => 10,
            'gr_id' => 'group1',
            'member_id_from' => 'a',
            'member_id_to' => 'z',
            'email_contains' => 'example.com',
            'mailling_only' => '1',
        ]);
        self::assertSame(1000, $recipients['pagination']['per_page']);
        self::assertCount(1, $recipients['items']);
    }

    public function testPollManageServiceSeparatesAdminDetailFromPublicResult(): void
    {
        $repository = $this->createMock(AdminPollRepository::class);
        $repository->expects(self::once())
            ->method('list')
            ->with(2, 10)
            ->willReturn([
                'total' => 11,
                'items' => [['po_id' => 5]],
            ]);
        $repository->expects(self::exactly(5))
            ->method('find')
            ->willReturnCallback(static function (int $pollId): ?array {
                return match ($pollId) {
                    5 => [
                        'po_id' => 5,
                        'po_subject' => '만족도',
                        'po_date' => '2026-03-10',
                        'po_level' => 1,
                        'po_point' => 0,
                        'po_use' => 1,
                        'po_etc' => '기타 의견을 입력하세요',
                        'po_poll1' => '좋음',
                        'po_poll2' => '보통',
                        'po_cnt1' => 3,
                        'po_cnt2' => 1,
                    ],
                    9 => [
                        'po_id' => 9,
                        'po_subject' => '업데이트',
                        'po_date' => '2026-03-10',
                        'po_level' => 1,
                        'po_point' => 0,
                        'po_use' => 1,
                        'po_etc' => '기타 의견을 입력하세요',
                        'po_poll1' => '찬성',
                        'po_poll2' => '반대',
                        'po_cnt1' => 2,
                        'po_cnt2' => 2,
                    ],
                    default => null,
                };
            });
        $repository->expects(self::once())
            ->method('listEtc')
            ->willReturn([['pc_name' => 'neo', 'pc_idea' => '기타']]);
        $repository->expects(self::once())
            ->method('create')
            ->with(self::callback(static function (array $payload): bool {
                return ($payload['po_subject'] ?? null) === '새 투표'
                    && ($payload['po_poll1'] ?? null) === '찬성'
                    && ($payload['po_poll2'] ?? null) === '반대'
                    && ($payload['po_etc'] ?? null) === '기타 의견을 입력하세요';
            }))
            ->willReturn(5);
        $repository->expects(self::once())
            ->method('update')
            ->with(9, ['po_subject' => '업데이트'])
            ->willReturn(1);
        $repository->expects(self::once())
            ->method('delete')
            ->with(9)
            ->willReturn(1);

        $resultService = new AdminPollResultService($repository);
        $service = new AdminPollManageService($repository, $resultService);
        $admin = ['mb_level' => 10];

        $listed = $service->listAdmin($admin, ['page' => 2, 'per_page' => 10]);
        self::assertSame(2, $listed['pagination']['page']);
        self::assertSame(2, $listed['pagination']['last_page']);

        $detail = $service->detailAdmin($admin, 5);
        self::assertSame(3, $detail['po_cnt1']);
        self::assertSame(1, $detail['po_cnt2']);

        $created = $service->createAdmin($admin, [
            'po_subject' => '새 투표',
            'options' => ['찬성', '반대'],
            'po_etc' => '기타 의견을 입력하세요',
        ]);
        self::assertSame(5, $created['po_id']);

        $updated = $service->updateAdmin(9, $admin, ['po_subject' => '업데이트']);
        self::assertSame(9, $updated['po_id']);

        $result = $service->result(9);
        self::assertSame(9, $result['po_id']);
        self::assertSame(4, $result['total_votes']);
        self::assertCount(1, $result['etc_items']);
        self::assertSame(50.0, $result['choices'][0]['percent']);
        $service->deleteAdmin(9, $admin);
        self::assertTrue(true);
    }

    public function testPopupServiceCoversAdminCrudAndActiveListing(): void
    {
        $repository = $this->createMock(AdminPopupRepository::class);
        $repository->expects(self::once())
            ->method('list')
            ->with(2, 10)
            ->willReturn([
                'total' => 12,
                'items' => [['nw_id' => 1]],
            ]);
        $repository->expects(self::exactly(4))
            ->method('find')
            ->willReturnCallback(static function (int $popupId): ?array {
                return match ($popupId) {
                    1 => ['nw_id' => 1, 'nw_subject' => '팝업', 'nw_content' => '본문'],
                    2 => ['nw_id' => 2, 'nw_subject' => '수정', 'nw_content' => '본문'],
                    default => null,
                };
            });
        $repository->expects(self::once())
            ->method('create')
            ->with(self::callback(static function (array $payload): bool {
                return ($payload['nw_subject'] ?? null) === '새 팝업'
                    && ($payload['nw_content'] ?? null) === '내용'
                    && ($payload['nw_division'] ?? null) === 'both'
                    && ($payload['nw_device'] ?? null) === 'both';
            }))
            ->willReturn(1);
        $repository->expects(self::once())
            ->method('update')
            ->with(2, ['nw_subject' => '수정'])
            ->willReturn(1);
        $repository->expects(self::once())
            ->method('delete')
            ->with(2)
            ->willReturn(1);
        $repository->expects(self::once())
            ->method('listActive')
            ->with(self::isType('string'), 'mobile', 'comm')
            ->willReturn([
                ['nw_id' => 10, 'nw_subject' => '활성'],
            ]);

        $service = new AdminPopupService($repository);
        $admin = ['mb_level' => 10];

        $listed = $service->listAdmin($admin, ['page' => 2, 'per_page' => 10]);
        self::assertSame(2, $listed['pagination']['page']);
        self::assertSame(2, $listed['pagination']['last_page']);

        self::assertSame(1, $service->detailAdmin($admin, 1)['nw_id']);
        self::assertSame(1, $service->createAdmin($admin, ['nw_subject' => '새 팝업', 'nw_content' => '내용'])['nw_id']);
        self::assertSame(2, $service->updateAdmin(2, $admin, ['nw_subject' => '수정'])['nw_id']);
        $service->deleteAdmin(2, $admin);

        $active = $service->active(['device' => 'mobile', 'division' => 'comm']);
        self::assertSame('mobile', $active['device']);
        self::assertCount(1, $active['items']);
    }
}
