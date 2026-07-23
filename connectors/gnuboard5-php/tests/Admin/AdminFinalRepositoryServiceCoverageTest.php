<?php

declare(strict_types=1);

namespace Tests\Admin;

use Api\Admin\Board\Repository\AdminBoardRepository;
use Api\Admin\Board\Service\AdminBoardService;
use Api\Admin\Config\Repository\AdminConfigRepository;
use Api\Admin\Config\Service\AdminConfigService;
use Api\Admin\Content\Repository\AdminContentRepository;
use Api\Admin\Content\Service\AdminContentService;
use Api\Admin\Menu\Repository\AdminMenuRepository;
use Api\Admin\Menu\Service\AdminMenuService;
use Api\Admin\Popular\Repository\AdminPopularRepository;
use Api\Admin\Popular\Service\AdminPopularService;
use Api\Admin\Report\Repository\AdminReportRepository;
use Api\Admin\Report\Service\AdminReportService;
use Api\Admin\WriteCount\Repository\AdminWriteCountRepository;
use Api\Admin\WriteCount\Service\AdminWriteCountService;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class AdminFinalRepositoryServiceCoverageTest extends TestCase
{
    public function testPopularServiceCoversListRankAndReset(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects(self::exactly(4))
            ->method('executeQuery')
            ->willReturnCallback(function (string $sql, array $params = []): Result {
                if (str_contains($sql, 'COUNT(*) AS cnt FROM g5_popular')) {
                    self::assertSame('2026-03-01', $params['date_from']);
                    self::assertSame('2026-03-10', $params['date_to']);

                    return $this->createDbalResult(['cnt' => 3]);
                }

                if (str_contains($sql, 'FROM (')) {
                    return $this->createDbalResult(false, [['cnt' => 1]]);
                }

                if (str_contains($sql, 'GROUP BY pp_date, pp_word')) {
                    return $this->createDbalResult(false, [
                        ['pp_word' => 'neo', 'pp_date' => '2026-03-10', 'pp_cnt' => 2],
                    ]);
                }

                return $this->createDbalResult(false, [
                    ['pp_word' => 'neo', 'hit_count' => 4, 'first_date' => '2026-03-01', 'last_date' => '2026-03-10'],
                ]);
            });
        $qb->expects(self::once())
            ->method('executeStatement')
            ->with(
                self::stringContains('DELETE FROM g5_popular WHERE pp_date BETWEEN :date_from AND :date_to'),
                ['date_from' => '2026-03-01', 'date_to' => '2026-03-10']
            )
            ->willReturn(3);

        $service = new AdminPopularService(new AdminPopularRepository($qb, new TableRegistry('g5_')));

        $listed = $service->list([
            'page' => 1,
            'per_page' => 10,
            'date_from' => '2026-03-01',
            'date_to' => '2026-03-10',
        ]);
        self::assertSame(1, $listed['pagination']['total']);
        self::assertSame(1, $listed['items'][0]['pp_rank']);

        $ranked = $service->rank([
            'limit' => 10,
            'date_from' => '2026-03-01',
            'date_to' => '2026-03-10',
        ]);
        self::assertSame(1, $ranked[0]['rank']);

        $reset = $service->reset([
            'date_from' => '2026-03-01',
            'date_to' => '2026-03-10',
        ]);
        self::assertSame(3, $reset['deleted_rows']);
    }

    public function testContentServiceCoversCrudFlow(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $state = [
            'about' => ['co_id' => 'about', 'co_subject' => '소개', 'co_content' => '본문'],
        ];

        $qb->method('executeQuery')
            ->willReturnCallback(function (string $sql, array $params = []) use (&$state): Result {
                if (str_contains($sql, 'COUNT(*) AS cnt FROM g5_content')) {
                    return $this->createDbalResult(['cnt' => count($state)]);
                }

                if (str_contains($sql, 'ORDER BY co_id ASC')) {
                    return $this->createDbalResult(false, array_values($state));
                }

                $contentId = (string)($params['co_id'] ?? '');
                return $this->createDbalResult($state[$contentId] ?? false);
            });
        $qb->expects(self::exactly(3))
            ->method('executeStatement')
            ->willReturnCallback(function (string $sql, array $params = []) use (&$state): int {
                if (str_starts_with($sql, 'INSERT INTO g5_content')) {
                    $state[$params['co_id']] = [
                        'co_id' => $params['co_id'],
                        'co_subject' => $params['co_subject'],
                        'co_content' => $params['co_content'],
                    ];

                    return 1;
                }

                if (str_starts_with($sql, 'UPDATE g5_content')) {
                    $state['about']['co_subject'] = $params['u_co_subject'];

                    return 1;
                }

                unset($state[$params['co_id']]);
                return 1;
            });

        $service = new AdminContentService(new AdminContentRepository($qb, new TableRegistry('g5_')));

        self::assertSame(1, $service->list([])['pagination']['total']);
        self::assertSame('소개', $service->detail('about')['co_subject']);
        self::assertSame('신규', $service->create([
            'co_id' => 'new_page',
            'co_subject' => '신규',
            'co_content' => '생성',
        ])['co_subject']);
        self::assertSame('업데이트', $service->update('about', ['co_subject' => '업데이트'])['co_subject']);
        $service->delete('new_page');
        self::assertTrue(true);
    }

    public function testBoardServiceCoversCrudAndCopyFlow(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $state = [
            'notice' => ['bo_table' => 'notice', 'bo_subject' => '공지', 'gr_id' => 'community', 'bo_count_write' => 1, 'bo_count_comment' => 0],
        ];

        $qb->method('executeQuery')
            ->willReturnCallback(function (string $sql, array $params = []) use (&$state): Result {
                if (str_contains($sql, 'COUNT(*) AS cnt FROM g5_board')) {
                    return $this->createDbalResult(['cnt' => count($state)]);
                }

                if (str_contains($sql, 'ORDER BY')) {
                    return $this->createDbalResult(false, array_values($state));
                }

                $board = (string)($params['bo_table'] ?? '');
                return $this->createDbalResult($state[$board] ?? false);
            });
        $qb->expects(self::exactly(5))
            ->method('executeStatement')
            ->willReturnCallback(function (string $sql, array $params = []) use (&$state): int {
                if (str_starts_with($sql, 'INSERT INTO g5_board')) {
                    $state[$params['bo_table']] = [
                        'bo_table' => $params['bo_table'],
                        'bo_subject' => $params['bo_subject'],
                        'gr_id' => $params['gr_id'],
                        'bo_count_write' => 0,
                        'bo_count_comment' => 0,
                    ];

                    return 1;
                }

                if (str_starts_with($sql, 'UPDATE g5_board')) {
                    $state['notice']['bo_subject'] = $params['u_bo_subject'];

                    return 1;
                }

                if (str_starts_with($sql, 'DELETE FROM g5_board')) {
                    unset($state[$params['bo_table']]);

                    return 1;
                }

                return 1;
            });

        $service = new AdminBoardService(new AdminBoardRepository($qb, new TableRegistry('g5_')));

        self::assertSame(1, $service->list([])['pagination']['total']);
        self::assertSame('공지', $service->detail('notice')['bo_subject']);
        self::assertSame('자유', $service->create([
            'bo_table' => 'free',
            'bo_subject' => '자유',
            'gr_id' => 'community',
        ])['bo_subject']);
        self::assertSame('업데이트', $service->update('notice', ['bo_subject' => '업데이트'])['bo_subject']);
        self::assertSame('공지 복사', $service->copy('notice', ['target_bo_table' => 'notice_copy', 'target_bo_subject' => '공지 복사'])['bo_subject']);
        $service->delete('free');
        self::assertTrue(true);
    }

    public function testWriteCountServiceCoversStatsAggregation(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects(self::once())
            ->method('executeQuery')
            ->with(
                self::stringContains('FROM g5_board_new'),
                ['date_from' => '2026-03-01', 'date_to' => '2026-03-10', 'bo_table' => 'notice']
            )
            ->willReturn($this->createDbalResult(false, [
                ['bucket' => '2026-03-01', 'write_count' => 2, 'comment_count' => 1],
                ['bucket' => '2026-03-02', 'write_count' => 3, 'comment_count' => 0],
            ]));

        $service = new AdminWriteCountService(new AdminWriteCountRepository($qb, new TableRegistry('g5_')));
        $result = $service->stats([
            'period' => 'day',
            'date_from' => '2026-03-01',
            'date_to' => '2026-03-10',
            'bo_table' => 'notice',
        ]);

        self::assertSame(5, $result['summary']['write_total']);
        self::assertSame(1, $result['summary']['comment_total']);
        self::assertCount(2, $result['items']);
    }

    public function testConfigServiceCoversGetAndNormalizedUpdate(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects(self::exactly(3))
            ->method('executeQuery')
            ->willReturn($this->createDbalResult([
                'cf_title' => 'G5',
                'cf_admin' => 'super',
                'cf_admin_email' => 'admin@example.com',
                'cf_use_point' => 1,
                'cf_cert_use' => 1,
                'cf_cert_ipin' => 1,
                'cf_cert_hp' => 0,
                'cf_cert_simple' => '',
            ]));
        $qb->expects(self::once())
            ->method('executeStatement')
            ->with(
                self::stringContains('UPDATE g5_config SET'),
                self::callback(static function (array $params): bool {
                    return ($params['u_cf_admin_email'] ?? null) === 'next@example.com'
                        && ($params['u_cf_use_point'] ?? null) === 0
                        && ($params['u_cf_register_level'] ?? null) === 3
                        && ($params['u_cf_icon_level'] ?? null) === 7
                        && ($params['u_cf_social_servicelist'] ?? null) === 'naver,kakao'
                        && ($params['u_cf_editor'] ?? null) === 'smarteditor2'
                        && ($params['u_cf_icode_server_port'] ?? null) === 7295
                        && ($params['u_cf_cert_use'] ?? null) === 0
                        && ($params['u_cf_cert_ipin'] ?? null) === ''
                        && ($params['u_cf_cert_hp'] ?? null) === ''
                        && ($params['u_cf_cert_simple'] ?? null) === '';
                })
            )
            ->willReturn(1);

        $service = new AdminConfigService(new AdminConfigRepository($qb, new TableRegistry('g5_')));

        $current = $service->get();
        self::assertSame('super', $current['cf_admin']);

        $updated = $service->update([
            'cf_admin_email' => 'next@example.com',
            'cf_use_point' => 'off',
            'cf_register_level' => '3',
            'cf_icon_level' => '7',
            'cf_social_servicelist' => ['naver', 'kakao', 'naver', 'invalid'],
            'cf_editor' => 'smart@editor2!',
            'cf_icode_server_port' => '7a2-95',
            'cf_cert_use' => '0',
        ]);
        self::assertSame('G5', $updated['cf_title']);
    }

    public function testMenuServiceCoversCrudAndReorder(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $state = [
            1 => ['me_id' => 1, 'me_code' => '100', 'me_name' => '메뉴', 'me_link' => '/menu', 'me_target' => '_self', 'me_order' => 1, 'me_use' => 1, 'me_mobile_use' => 1],
        ];

        $qb->method('executeQuery')
            ->willReturnCallback(function (string $sql, array $params = []) use (&$state): Result {
                if (str_contains($sql, 'ORDER BY me_order ASC')) {
                    return $this->createDbalResult(false, array_values($state));
                }

                $menuId = (int)($params['me_id'] ?? 0);
                return $this->createDbalResult($state[$menuId] ?? false);
            });
        $qb->expects(self::exactly(4))
            ->method('executeStatement')
            ->willReturnCallback(function (string $sql, array $params = []) use (&$state): int {
                if (str_starts_with($sql, 'INSERT INTO g5_menu')) {
                    $state[2] = [
                        'me_id' => 2,
                        'me_code' => $params['me_code'],
                        'me_name' => $params['me_name'],
                        'me_link' => $params['me_link'],
                        'me_target' => $params['me_target'],
                        'me_order' => $params['me_order'],
                        'me_use' => $params['me_use'],
                        'me_mobile_use' => $params['me_mobile_use'],
                    ];

                    return 1;
                }

                if (str_starts_with($sql, 'UPDATE g5_menu SET me_order')) {
                    $state[$params['me_id']]['me_order'] = $params['me_order'];

                    return 1;
                }

                if (str_starts_with($sql, 'UPDATE g5_menu SET')) {
                    $state[1]['me_name'] = $params['u_me_name'];

                    return 1;
                }

                unset($state[$params['me_id']]);
                return 1;
            });
        $qb->expects(self::once())->method('lastInsertId')->willReturn(2);
        $qb->expects(self::once())->method('beginTransaction');
        $qb->expects(self::once())->method('commit');

        $service = new AdminMenuService(new AdminMenuRepository($qb, new TableRegistry('g5_')));

        self::assertCount(1, $service->list());
        self::assertSame('메뉴', $service->detail(1)['me_name']);
        self::assertSame(2, $service->create(['me_code' => '200', 'me_name' => '신규', 'me_link' => '/new'])['me_id']);
        self::assertSame('수정', $service->update(1, ['me_name' => '수정'])['me_name']);
        $service->reorder(['orders' => [['me_id' => 1, 'me_order' => 2]]]);
        $service->delete(2);
        self::assertTrue(true);
    }

    public function testReportServiceCoversListUpdateAndStats(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')
            ->willReturnCallback(function (string $sql, array $params = []): Result {
                if (str_contains($sql, 'INFORMATION_SCHEMA.COLUMNS')) {
                    return $this->createDbalResult(false, [
                        ['COLUMN_NAME' => 'rp_admin_memo'],
                        ['COLUMN_NAME' => 'rp_processed_at'],
                    ]);
                }

                if (str_contains($sql, 'GROUP BY rp_status')) {
                    return $this->createDbalResult(false, [
                        ['rp_status' => 'pending', 'cnt' => 2],
                        ['rp_status' => 'approved', 'cnt' => 1],
                    ]);
                }

                if (str_contains($sql, 'COUNT(*) AS cnt')) {
                    return $this->createDbalResult(['cnt' => 1]);
                }

                if (str_contains($sql, 'LIMIT 1')) {
                    return $this->createDbalResult([
                        'rp_id' => 3,
                        'mb_id' => 'neo1',
                        'rp_target_type' => 'post',
                        'rp_target_id' => 10,
                        'rp_reason' => 'spam',
                        'rp_detail' => 'detail',
                        'rp_status' => 'approved',
                        'rp_admin_memo' => '확인',
                        'rp_datetime' => '2026-03-10 10:00:00',
                        'rp_processed_at' => '2026-03-10 10:05:00',
                    ]);
                }

                return $this->createDbalResult(false, [[
                    'rp_id' => 3,
                    'mb_id' => 'neo1',
                    'rp_target_type' => 'post',
                    'rp_target_id' => 10,
                    'rp_reason' => 'spam',
                    'rp_detail' => 'detail',
                    'rp_status' => 'pending',
                    'rp_admin_memo' => '',
                    'rp_datetime' => '2026-03-10 10:00:00',
                    'rp_processed_at' => null,
                ]]);
            });
        $qb->expects(self::exactly(2))
            ->method('executeStatement')
            ->willReturnCallback(static function (string $sql, array $params = []): int {
                if (str_contains($sql, 'CREATE TABLE IF NOT EXISTS g5_report')) {
                    return 0;
                }

                self::assertStringContainsString('UPDATE g5_report', $sql);
                self::assertSame('approved', $params['rp_status'] ?? null);
                self::assertSame('확인', $params['rp_admin_memo'] ?? null);
                self::assertSame(3, $params['rp_id'] ?? null);

                return 1;
            });

        $service = new AdminReportService(new AdminReportRepository($qb, new TableRegistry('g5_')));

        $listed = $service->list(['status' => 'pending', 'target_type' => 'post']);
        self::assertSame(1, $listed['pagination']['total']);

        $updated = $service->update(3, ['status' => 'approved', 'admin_memo' => '확인']);
        self::assertSame('approved', $updated['rp_status']);

        $stats = $service->stats();
        self::assertSame(3, $stats['total']);
        self::assertSame(2, $stats['pending']);
    }

    /**
     * @param array<string, mixed>|false $assoc
     * @param array<int, array<string, mixed>> $all
     */
    private function createDbalResult(array|false $assoc, array $all = []): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);
        $result->method('fetchAllAssociative')->willReturn($all);

        return $result;
    }
}
