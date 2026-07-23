<?php

declare(strict_types=1);

namespace Tests\Admin\System;

use Api\Admin\System\Repository\AdminSystemMaintenanceRepository;
use Api\Admin\System\Repository\AdminSystemRepository;
use Api\Admin\System\Service\AdminSystemAuthService;
use Api\Admin\System\Service\AdminSystemConfigService;
use Api\Admin\System\Service\AdminSystemMailDispatchService;
use Api\Admin\System\Service\AdminSystemMaintenanceService;
use Api\Admin\System\Service\AdminSystemPollService;
use Api\Admin\System\Service\AdminSystemPopupService;
use Api\Admin\System\Service\AdminSystemService;
use Api\Admin\System\Service\AdminSystemThemeService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

final class AdminSystemCoverageServiceTest extends TestCase
{
    /** @var list<string> */
    private array $tempDirectories = [];

    protected function tearDown(): void
    {
        parent::tearDown();

        unset($_ENV['AUTH_MAIL_UNSUBSCRIBE_URL'], $_ENV['AUTH_MAIL_SEND_ENABLED']);

        foreach ($this->tempDirectories as $directory) {
            $this->removeDirectory($directory);
        }

        $this->tempDirectories = [];
    }

    public function testAuthServiceCoversListSaveAndDelete(): void
    {
        $repository = $this->createMock(AdminSystemRepository::class);
        $repository->expects(self::once())
            ->method('listAuth')
            ->with(2, 15, 'neo01')
            ->willReturn([
                'total' => 16,
                'items' => [['mb_id' => 'neo01', 'au_menu' => 'menu100', 'au_auth' => 'rw']],
            ]);
        $repository->expects(self::once())
            ->method('upsertAuth')
            ->with('neo01', 'menu100', 'drw');
        $repository->expects(self::once())
            ->method('deleteAuth')
            ->with('neo01', 'menu100')
            ->willReturn(1);

        $service = new AdminSystemAuthService($repository);

        $listed = $service->listAuth([
            'page' => 2,
            'per_page' => 15,
            'mb_id' => ' neo01 ',
        ]);
        self::assertSame(2, $listed['pagination']['page']);
        self::assertSame(2, $listed['pagination']['last_page']);
        self::assertTrue($listed['pagination']['has_prev']);

        $saved = $service->saveAuth([
            'mb_id' => 'neo01',
            'au_menu' => 'menu100',
            'au_auth' => 'wdrw',
        ]);
        self::assertSame('drw', $saved['au_auth']);

        $service->deleteAuth(' neo01 ', 'menu100');
        self::assertTrue(true);
    }

    public function testPopupServiceCoversCrudFlow(): void
    {
        $repository = $this->createMock(AdminSystemRepository::class);
        $repository->expects(self::once())
            ->method('listPopups')
            ->with(2, 10)
            ->willReturn([
                'total' => 11,
                'items' => [['nw_id' => 7, 'nw_subject' => '공지']],
            ]);
        $repository->expects(self::exactly(4))
            ->method('findPopup')
            ->willReturnCallback(static function (int $popupId): ?array {
                return match ($popupId) {
                    7 => ['nw_id' => 7, 'nw_subject' => '공지', 'nw_content' => '본문'],
                    8 => ['nw_id' => 8, 'nw_subject' => '수정됨', 'nw_content' => '본문'],
                    default => null,
                };
            });
        $repository->expects(self::once())
            ->method('createPopup')
            ->with(self::callback(static function (array $payload): bool {
                return ($payload['nw_subject'] ?? null) === '공지'
                    && ($payload['nw_content'] ?? null) === '본문'
                    && ($payload['nw_division'] ?? null) === 'both'
                    && ($payload['nw_device'] ?? null) === 'both';
            }))
            ->willReturn(7);
        $repository->expects(self::once())
            ->method('updatePopup')
            ->with(8, ['nw_subject' => '수정됨'])
            ->willReturn(1);
        $repository->expects(self::once())
            ->method('deletePopup')
            ->with(8)
            ->willReturn(1);

        $service = new AdminSystemPopupService($repository);

        $listed = $service->listPopups(['page' => 2, 'per_page' => 10]);
        self::assertSame(2, $listed['pagination']['page']);
        self::assertSame(2, $listed['pagination']['last_page']);

        $detail = $service->detailPopup(7);
        self::assertSame(7, $detail['nw_id']);

        $created = $service->createPopup([
            'nw_subject' => '공지',
            'nw_content' => '본문',
        ]);
        self::assertSame('공지', $created['nw_subject']);

        $updated = $service->updatePopup(8, ['nw_subject' => '수정됨']);
        self::assertSame('수정됨', $updated['nw_subject']);

        $service->deletePopup(8);
        self::assertTrue(true);
    }

    public function testPopupServiceRejectsValuesOutsideOpenApiEnums(): void
    {
        $repository = $this->createMock(AdminSystemRepository::class);
        $repository->expects(self::never())->method('createPopup');
        $service = new AdminSystemPopupService($repository);

        foreach (
            [
                [['nw_subject' => '공지', 'nw_content' => '본문', 'nw_division' => 'invalid'], 'nw_division'],
                [['nw_subject' => '공지', 'nw_content' => '본문', 'nw_device' => 'invalid'], 'nw_device'],
            ] as [$payload, $field]
        ) {
            try {
                $service->createPopup($payload);
                self::fail("{$field} enum 검증이 누락되었습니다.");
            } catch (ApiException $exception) {
                self::assertStringContainsString("{$field} 값이 올바르지 않습니다.", $exception->getMessage());
            }
        }
    }

    public function testPopupServiceRejectsUndeclaredField(): void
    {
        $repository = $this->createMock(AdminSystemRepository::class);
        $repository->expects(self::never())->method('createPopup');
        $service = new AdminSystemPopupService($repository);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('지원하지 않는 팝업 요청 필드가 포함되어 있습니다.');

        $service->createPopup([
            'nw_subject' => '공지',
            'nw_content' => '본문',
            'unknown' => true,
        ]);
    }

    public function testPollServiceCoversCrudFlow(): void
    {
        $repository = $this->createMock(AdminSystemRepository::class);
        $repository->expects(self::once())
            ->method('listPolls')
            ->with(2, 20)
            ->willReturn([
                'total' => 25,
                'items' => [['po_id' => 3, 'po_subject' => '투표']],
            ]);
        $repository->expects(self::exactly(3))
            ->method('findPoll')
            ->willReturnCallback(static function (int $pollId): ?array {
                return match ($pollId) {
                    3 => ['po_id' => 3, 'po_subject' => '투표'],
                    9 => ['po_id' => 9, 'po_subject' => '업데이트됨'],
                    default => null,
                };
            });
        $repository->expects(self::once())
            ->method('createPoll')
            ->with(self::callback(static function (array $payload): bool {
                return ($payload['po_subject'] ?? null) === '만족도'
                    && ($payload['po_poll1'] ?? null) === '좋음'
                    && ($payload['po_poll2'] ?? null) === '보통'
                    && array_key_exists('po_date', $payload);
            }))
            ->willReturn(3);
        $repository->expects(self::once())
            ->method('updatePoll')
            ->with(9, ['po_subject' => '업데이트됨'])
            ->willReturn(1);
        $repository->expects(self::once())
            ->method('deletePoll')
            ->with(9)
            ->willReturn(1);

        $service = new AdminSystemPollService($repository);

        $listed = $service->listPolls(['page' => 2]);
        self::assertSame(2, $listed['pagination']['page']);
        self::assertCount(1, $listed['items']);

        $created = $service->createPoll([
            'po_subject' => '만족도',
            'po_poll1' => '좋음',
            'po_poll2' => '보통',
        ]);
        self::assertSame(3, $created['po_id']);

        $updated = $service->updatePoll(9, ['po_subject' => '업데이트됨']);
        self::assertSame('업데이트됨', $updated['po_subject']);

        $service->deletePoll(9);
        self::assertTrue(true);
    }

    public function testConfigServiceCoversDefaultsUpdatesAndLists(): void
    {
        $repository = $this->createMock(AdminSystemRepository::class);
        $repository->expects(self::exactly(2))
            ->method('getQaConfig')
            ->willReturnOnConsecutiveCalls(
                null,
                ['qa_id' => 1, 'qa_title' => '문의', 'qa_skin' => 'basic', 'qa_mobile_skin' => 'mobile']
            );
        $repository->expects(self::once())
            ->method('updateQaConfig')
            ->with(['qa_title' => '문의']);
        $repository->expects(self::exactly(3))
            ->method('getThemeConfig')
            ->willReturnOnConsecutiveCalls(
                ['cf_theme' => 'basic', 'cf_mobile_theme' => 'mobile'],
                ['cf_theme' => 'basic', 'cf_mobile_theme' => 'mobile'],
                ['cf_theme' => 'basic', 'cf_mobile_theme' => 'mobile']
            );
        $repository->expects(self::once())
            ->method('updateThemeConfig')
            ->with('basic', 'mobile');
        $repository->expects(self::once())
            ->method('listMailTemplates')
            ->with(3, 5)
            ->willReturn([
                'total' => 9,
                'items' => [['ma_id' => 1]],
            ]);
        $repository->expects(self::once())
            ->method('listMailRecipients')
            ->with(1, 1000, 'neo')
            ->willReturn([
                'total' => 2,
                'items' => [['mb_id' => 'neo1']],
            ]);

        $service = new AdminSystemConfigService($repository);

        $defaultConfig = $service->getQaConfig();
        self::assertSame('1:1 문의', $defaultConfig['qa_title']);

        $updatedConfig = $service->updateQaConfig(['qa_title' => '문의']);
        self::assertSame('문의', $updatedConfig['qa_title']);

        $theme = $service->getTheme();
        self::assertSame('basic', $theme['cf_theme']);

        $updatedTheme = $service->updateTheme(['cf_mobile_theme' => 'mobile']);
        self::assertSame('basic', $updatedTheme['cf_theme']);
        self::assertSame('mobile', $updatedTheme['cf_mobile_theme']);

        $mails = $service->listMails(['page' => 3, 'per_page' => 5]);
        self::assertSame(2, $mails['pagination']['last_page']);

        $recipients = $service->listMailRecipients(['search' => 'neo', 'per_page' => 2000]);
        self::assertSame(1000, $recipients['pagination']['per_page']);
        self::assertCount(1, $recipients['items']);
    }

    public function testMailDispatchServiceSupportsDryRunAndPersonalization(): void
    {
        $repository = $this->createMock(AdminSystemRepository::class);
        $repository->expects(self::once())
            ->method('findMailTemplate')
            ->with(9)
            ->willReturn([
                'ma_subject' => '안내',
                'ma_content' => '{이름} {회원아이디} {이메일}',
            ]);
        $repository->expects(self::once())
            ->method('findMailRecipientsByIds')
            ->with(['neo1', 'neo2'], false)
            ->willReturn([
                ['mb_id' => 'neo1', 'mb_name' => '네오', 'mb_nick' => 'neo', 'mb_email' => 'neo1@example.com'],
                ['mb_id' => 'neo2', 'mb_name' => '트리니티', 'mb_nick' => 'tri', 'mb_email' => ''],
            ]);
        $repository->expects(self::once())
            ->method('createMailTestRecord')
            ->with(
                '[MEMBER_SEND] 안내',
                '{이름} {회원아이디} {이메일}',
                '127.0.0.1',
                self::callback(static function (array $meta): bool {
                    return ($meta['kind'] ?? null) === 'member_send'
                        && ($meta['ma_id'] ?? null) === 9
                        && ($meta['target_count'] ?? null) === 2
                        && ($meta['sent_count'] ?? null) === 0
                        && ($meta['dry_run'] ?? null) === true
                        && ($meta['mailling_only'] ?? null) === false
                        && is_string($meta['created_at'] ?? null);
                })
            )
            ->willReturn(101);

        $service = new AdminSystemMailDispatchService($repository);
        $result = $service->sendMemberMail([
            'ma_id' => 9,
            'mb_ids' => ['neo1', 'neo2'],
            'dry_run' => true,
            'mailling_only' => false,
        ], '127.0.0.1');

        self::assertSame(101, $result['mail_log_id']);
        self::assertSame(2, $result['target_count']);
        self::assertSame(0, $result['sent_count']);
        self::assertSame(2, $result['skipped_count']);
        self::assertCount(1, $result['recipients']);

        $_ENV['AUTH_MAIL_UNSUBSCRIBE_URL'] = 'https://example.com/unsubscribe';
        $personalized = $this->invokePrivate(
            $service,
            'personalizeMailContent',
            ['안녕하세요 {이름} {회원아이디} {이메일}', 'neo1', '네오', 'neo', 'neo1@example.com']
        );

        self::assertStringContainsString('안녕하세요 네오 neo1 neo1@example.com', $personalized);
        self::assertStringContainsString('https://example.com/unsubscribe?mb_id=neo1&mb_email=neo1%40example.com', $personalized);
    }

    public function testMailDispatchServiceRejectsInvalidMemberIds(): void
    {
        $service = new AdminSystemMailDispatchService($this->createMock(AdminSystemRepository::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('mb_ids에 유효하지 않은 mb_id가 포함되어 있습니다.');

        $service->sendMemberMail([
            'subject' => '안내',
            'content' => '본문',
            'mb_ids' => ['bad-id!'],
        ], '127.0.0.1');
    }

    public function testSystemWriteServicesRejectUndeclaredFields(): void
    {
        $repository = $this->createMock(AdminSystemRepository::class);
        $maintenanceRepository = $this->createMock(AdminSystemMaintenanceRepository::class);
        $projectRoot = $this->createProjectRootWithTheme('basic');
        $dataPath = $this->createMaintenanceDataPath();
        $admin = $this->adminMember();

        $cases = [
            [
                static fn () => (new AdminSystemAuthService($repository))->saveAuth([
                    'mb_id' => 'neo01', 'au_menu' => 'menu100', 'au_auth' => 'rw', 'unknown' => true,
                ]),
                '관리 권한',
            ],
            [
                static fn () => (new AdminSystemPollService($repository))->createPoll([
                    'po_subject' => '투표', 'po_poll1' => '찬성', 'po_poll2' => '반대', 'unknown' => true,
                ]),
                '투표',
            ],
            [
                static fn () => (new AdminSystemConfigService($repository))->updateQaConfig(['unknown' => true]),
                'QA 설정',
            ],
            [
                static fn () => (new AdminSystemMailDispatchService($repository))->sendMailTest([
                    'to' => 'neo@example.com', 'subject' => '테스트', 'content' => '본문', 'unknown' => true,
                ], '127.0.0.1'),
                '테스트 메일',
            ],
            [
                static fn () => (new AdminSystemMailDispatchService($repository))->sendMemberMail([
                    'subject' => '공지', 'content' => '본문', 'mb_ids' => ['neo01'], 'unknown' => true,
                ], '127.0.0.1'),
                '회원 메일',
            ],
            [
                static fn () => (new AdminSystemThemeService($repository, $projectRoot))->updateTheme(
                    $admin,
                    ['unknown' => true]
                ),
                '테마 설정',
            ],
            [
                static fn () => (new AdminSystemMaintenanceService(
                    $maintenanceRepository,
                    $projectRoot,
                    $dataPath
                ))->convertBrowscap($admin, ['unknown' => true]),
                'Browscap 변환',
            ],
        ];

        foreach ($cases as [$call, $label]) {
            try {
                $call();
                self::fail("{$label} 미선언 필드가 허용되었습니다.");
            } catch (ApiException $exception) {
                self::assertStringContainsString('지원하지 않는', $exception->getMessage());
            }
        }
    }

    public function testAdminSystemServiceDelegatesAcrossChildren(): void
    {
        $repository = $this->createMock(AdminSystemRepository::class);
        $repository->method('listAuth')->willReturn(['total' => 1, 'items' => [['mb_id' => 'neo1']]]);
        $repository->expects(self::once())
            ->method('upsertAuth');
        $repository->method('deleteAuth')->willReturn(1);
        $repository->method('listPopups')->willReturn(['total' => 1, 'items' => [['nw_id' => 1]]]);
        $repository->method('findPopup')->willReturn(['nw_id' => 1, 'nw_subject' => '팝업', 'nw_content' => '본문']);
        $repository->method('createPopup')->willReturn(1);
        $repository->method('updatePopup')->willReturn(1);
        $repository->method('deletePopup')->willReturn(1);
        $repository->method('listPolls')->willReturn(['total' => 1, 'items' => [['po_id' => 1]]]);
        $repository->method('findPoll')->willReturn(['po_id' => 1, 'po_subject' => '투표', 'po_poll1' => '찬성', 'po_poll2' => '반대']);
        $repository->method('createPoll')->willReturn(1);
        $repository->method('updatePoll')->willReturn(1);
        $repository->method('deletePoll')->willReturn(1);
        $repository->method('getQaConfig')->willReturn(['qa_id' => 1, 'qa_title' => '문의', 'qa_skin' => 'basic', 'qa_mobile_skin' => 'mobile']);
        $repository->method('updateQaConfig')->willReturn(1);
        $repository->method('listMailTemplates')->willReturn(['total' => 1, 'items' => [['ma_id' => 1]]]);
        $repository->method('listMailRecipients')->willReturn(['total' => 1, 'items' => [['mb_id' => 'neo1']]]);
        $repository->method('createMailTestRecord')->willReturn(5);
        $repository->method('findMailRecipientsByIds')->willReturn([
            ['mb_id' => 'neo1', 'mb_name' => '네오', 'mb_nick' => 'neo', 'mb_email' => 'neo1@example.com'],
        ]);
        $repository->method('getThemeConfig')->willReturn(['cf_theme' => 'basic', 'cf_mobile_theme' => 'mobile']);
        $repository->method('updateThemeConfig')->willReturn(1);

        $projectRoot = $this->createProjectRootWithTheme('basic');
        $themeService = new AdminSystemThemeService($repository, $projectRoot);

        $maintenanceRepository = $this->createMock(AdminSystemMaintenanceRepository::class);
        $maintenanceRepository->method('countVisitRowsMissingBrowscap')->willReturn(0);
        $dataPath = $this->createMaintenanceDataPath();
        $maintenanceService = new AdminSystemMaintenanceService($maintenanceRepository, $projectRoot, $dataPath);

        $service = new AdminSystemService(
            new AdminSystemAuthService($repository),
            new AdminSystemPopupService($repository),
            new AdminSystemPollService($repository),
            new AdminSystemConfigService($repository),
            new AdminSystemMailDispatchService($repository),
            $themeService,
            $maintenanceService
        );

        $admin = $this->adminMember();

        self::assertSame(1, $service->listAuth([])['pagination']['total']);
        self::assertSame('rw', $service->saveAuth(['mb_id' => 'neo1', 'au_menu' => 'menu100', 'au_auth' => 'rw'])['au_auth']);
        $service->deleteAuth('neo1', 'menu100');

        self::assertSame(1, $service->listPopups([])['pagination']['total']);
        self::assertSame(1, $service->detailPopup(1)['nw_id']);
        self::assertSame(1, $service->createPopup(['nw_subject' => '팝업', 'nw_content' => '본문'])['nw_id']);
        self::assertSame(1, $service->updatePopup(1, ['nw_subject' => '팝업'])['nw_id']);
        $service->deletePopup(1);

        self::assertSame(1, $service->listPolls([])['pagination']['total']);
        self::assertSame(1, $service->detailPoll(1)['po_id']);
        self::assertSame(1, $service->createPoll(['po_subject' => '투표', 'po_poll1' => '찬성', 'po_poll2' => '반대'])['po_id']);
        self::assertSame(1, $service->updatePoll(1, ['po_subject' => '투표'])['po_id']);
        $service->deletePoll(1);

        self::assertSame('문의', $service->getQaConfig()['qa_title']);
        self::assertSame('문의', $service->updateQaConfig(['qa_title' => '문의'])['qa_title']);
        self::assertSame(1, $service->listMails([])['pagination']['total']);
        self::assertSame(1, $service->listMailRecipients([])['pagination']['total']);
        self::assertSame(5, $service->sendMailTest(['to' => 'neo@example.com', 'subject' => '테스트', 'content' => '본문'], '127.0.0.1')['mail_log_id']);
        self::assertSame(5, $service->sendMemberMail(['subject' => '안내', 'content' => '본문', 'mb_ids' => ['neo1'], 'dry_run' => true], '127.0.0.1')['mail_log_id']);

        self::assertSame('basic', $service->getTheme($admin)['cf_theme']);
        self::assertSame('basic', $service->updateTheme($admin, ['cf_theme' => 'basic'])['cf_theme']);
        self::assertSame(2, $service->listThemes($admin)['total']);
        self::assertSame('basic', $service->detailTheme($admin, 'basic')['id']);

        self::assertArrayHasKey('php_version', $service->phpInfo($admin));
        self::assertSame('completed', $service->purgeSessionFiles($admin)['status']);
        self::assertSame('completed', $service->purgeCacheFiles($admin)['status']);
        self::assertSame('completed', $service->purgeCaptchaFiles($admin)['status']);
        self::assertSame('completed', $service->purgeThumbnailFiles($admin)['status']);
        self::assertSame('completed', $service->purgeMemberListFiles($admin)['status']);
        self::assertSame(0, $service->browscapStatus($admin)['pending_visit_count']);
    }

    /**
     * @param array<int, mixed> $args
     */
    private function invokePrivate(object $target, string $method, array $args): mixed
    {
        $reflection = new ReflectionClass($target);
        $instanceMethod = $reflection->getMethod($method);

        return $instanceMethod->invokeArgs($target, $args);
    }

    /**
     * @return array<string, mixed>
     */
    private function adminMember(): array
    {
        return [
            'mb_id' => 'super',
            'mb_level' => 10,
        ];
    }

    private function createProjectRootWithTheme(string $themeId): string
    {
        $root = sys_get_temp_dir() . '/g5-admin-system-theme-' . uniqid('', true);
        foreach ([$themeId, 'mobile'] as $id) {
            $themeRoot = $root . '/theme/' . $id;
            mkdir($themeRoot, 0777, true);
            file_put_contents($themeRoot . '/index.php', '<?php');
            file_put_contents($themeRoot . '/head.php', '<?php');
            file_put_contents($themeRoot . '/tail.php', '<?php');
            file_put_contents($themeRoot . '/readme.txt', "theme_name={$id}\nversion=1.0.0\n");
        }

        $this->tempDirectories[] = $root;

        return $root;
    }

    private function createMaintenanceDataPath(): string
    {
        $root = sys_get_temp_dir() . '/g5-admin-maint-' . uniqid('', true);
        mkdir($root . '/session', 0777, true);
        mkdir($root . '/cache', 0777, true);
        mkdir($root . '/file/free', 0777, true);
        mkdir($root . '/editor/basic', 0777, true);
        mkdir($root . '/member_list/log', 0777, true);

        file_put_contents($root . '/session/sess_old', 'session');
        touch($root . '/session/sess_old', time() - 30000, time() - 30000);
        file_put_contents($root . '/cache/latest-old', 'cache');
        file_put_contents($root . '/cache/content-old', 'cache');
        file_put_contents($root . '/cache/captcha-old', 'cache');
        touch($root . '/cache/captcha-old', time() - 7200);
        file_put_contents($root . '/file/free/thumb-1.jpg', 'thumb');
        file_put_contents($root . '/editor/basic/thumb-2.jpg', 'thumb');
        file_put_contents($root . '/member_list/sample.txt', 'member');

        $this->tempDirectories[] = $root;

        return $root;
    }

    private function removeDirectory(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $item) {
            if ($item->isDir()) {
                @rmdir($item->getPathname());
                continue;
            }

            @unlink($item->getPathname());
        }

        @rmdir($path);
    }
}
