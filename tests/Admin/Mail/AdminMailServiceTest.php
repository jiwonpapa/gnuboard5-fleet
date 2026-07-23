<?php

declare(strict_types=1);

namespace Tests\Admin\Mail;

use Api\Admin\Mail\Repository\AdminMailRepository;
use Api\Admin\Mail\Service\AdminMailDispatchService;
use Api\Admin\Mail\Service\AdminMailQueryService;
use Api\Admin\Mail\Service\AdminMailService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminMailServiceTest extends TestCase
{
    public function testSendRequiresSubjectAndContent(): void
    {
        $service = $this->createService($this->createMock(AdminMailRepository::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('subject/content 또는 ma_id는 필수입니다.');

        $service->send([
            'mb_level' => 10,
            'mb_id' => 'super',
        ], [
            'target_type' => 'all',
            'subject' => '',
            'content' => '',
        ], '127.0.0.1');
    }

    public function testSendMemberTargetRequiresMemberIds(): void
    {
        $service = $this->createService($this->createMock(AdminMailRepository::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('target_type=member 일 때 mb_ids는 필수입니다.');

        $service->send([
            'mb_level' => 10,
            'mb_id' => 'super',
        ], [
            'target_type' => 'member',
            'subject' => '공지',
            'content' => '내용',
            'mb_ids' => [],
        ], '127.0.0.1');
    }

    public function testSendTestReturnsDisabledStatusWhenMailDisabled(): void
    {
        $_ENV['AUTH_MAIL_SEND_ENABLED'] = 'false';

        $repository = $this->createMock(AdminMailRepository::class);

        $service = $this->createService($repository);
        $result = $service->sendTest([
            'mb_level' => 10,
            'mb_id' => 'super',
        ], [
            'to' => 'tester@example.com',
            'subject' => '테스트 메일',
            'content' => '본문',
        ], '127.0.0.1');

        $this->assertFalse($result['mail_enabled']);
        $this->assertNull($result['ma_id']);
    }

    public function testDetailReturnsPreviewAndLastOption(): void
    {
        $repository = $this->createMock(AdminMailRepository::class);
        $repository->expects($this->once())
            ->method('findTemplate')
            ->with(5)
            ->willReturn([
                'ma_id' => 5,
                'ma_subject' => '공지 템플릿',
                'ma_content' => '<p>본문</p>',
                'ma_last_option' => 'mb_id1=0||mb_id1_from=alpha||mb_id1_to=omega||mb_email=@example.com||mb_mailling=1||mb_level_from=2||mb_level_to=8||gr_id=staff',
            ]);

        $service = $this->createService($repository);
        $result = $service->detailAdmin([
            'mb_level' => 10,
            'mb_id' => 'super',
        ], 5);

        $this->assertStringContainsString('수신거부', (string)$result['preview_html']);
        $this->assertSame([
            'mb_id1' => 0,
            'mb_id1_from' => 'alpha',
            'mb_id1_to' => 'omega',
            'mb_email' => '@example.com',
            'mb_mailling' => 1,
            'mb_level_from' => 2,
            'mb_level_to' => 8,
            'gr_id' => 'staff',
        ], $result['last_option']);
    }

    public function testCreateTemplateRequiresSubjectAndContent(): void
    {
        $service = $this->createService($this->createMock(AdminMailRepository::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('ma_subject는 필수입니다.');

        $service->createAdmin([
            'mb_level' => 10,
            'mb_id' => 'super',
        ], [
            'ma_subject' => '',
            'ma_content' => '본문',
        ], '127.0.0.1');
    }

    public function testTemplateRejectsUndeclaredFields(): void
    {
        $service = $this->createService($this->createMock(AdminMailRepository::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('허용되지 않은 필드');

        $service->createAdmin([
            'mb_level' => 10,
            'mb_id' => 'super',
        ], [
            'ma_subject' => '공지',
            'ma_content' => '본문',
            'unknown' => true,
        ], '127.0.0.1');
    }

    public function testSendRejectsUndeclaredFields(): void
    {
        $service = $this->createService($this->createMock(AdminMailRepository::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('허용되지 않은 필드');

        $service->send([
            'mb_level' => 10,
            'mb_id' => 'super',
        ], [
            'target_type' => 'all',
            'subject' => '공지',
            'content' => '본문',
            'unknown' => true,
        ], '127.0.0.1');
    }

    public function testSendTestRejectsUndeclaredFields(): void
    {
        $service = $this->createService($this->createMock(AdminMailRepository::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('허용되지 않은 필드');

        $service->sendTest([
            'mb_level' => 10,
            'mb_id' => 'super',
        ], [
            'to' => 'tester@example.com',
            'subject' => '공지',
            'content' => '본문',
            'unknown' => true,
        ], '127.0.0.1');
    }

    public function testSendUsesTemplateWhenMailIdProvided(): void
    {
        $repository = $this->createMock(AdminMailRepository::class);
        $repository->expects($this->once())
            ->method('findTemplate')
            ->with(5)
            ->willReturn([
                'ma_id' => 5,
                'ma_subject' => '공지 템플릿',
                'ma_content' => '안녕하세요 {이름}',
            ]);
        $repository->expects($this->once())
            ->method('findRecipientsForSend')
            ->willReturn([
                [
                    'mb_id' => 'user1',
                    'mb_name' => '사용자',
                    'mb_nick' => '닉',
                    'mb_email' => 'user1@example.com',
                    'mb_level' => 2,
                    'mb_mailling' => 1,
                    'mb_datetime' => '2026-03-06 00:00:00',
                ],
            ]);
        $repository->expects($this->once())
            ->method('saveLastOption')
            ->with(5, $this->stringContains('mb_level_from=1'));

        $service = $this->createService($repository);
        $result = $service->send([
            'mb_level' => 10,
            'mb_id' => 'super',
        ], [
            'ma_id' => 5,
            'target_type' => 'all',
            'dry_run' => true,
        ], '127.0.0.1');

        $this->assertSame(5, $result['ma_id']);
        $this->assertTrue($result['template_used']);
        $this->assertSame(1, $result['target_count']);
    }

    public function testServiceDelegatesListDeleteUpdateAndRecipients(): void
    {
        $repository = $this->createMock(AdminMailRepository::class);
        $repository->expects($this->once())
            ->method('listTemplates')
            ->with(2, 10)
            ->willReturn([
                'total' => 11,
                'items' => [['ma_id' => 1]],
            ]);
        $repository->expects($this->exactly(2))
            ->method('findTemplate')
            ->willReturnOnConsecutiveCalls(
                ['ma_id' => 3, 'ma_subject' => '업데이트', 'ma_content' => '<p>본문</p>', 'ma_last_option' => ''],
                ['ma_id' => 3, 'ma_subject' => '업데이트', 'ma_content' => '<p>본문</p>', 'ma_last_option' => '']
            );
        $repository->expects($this->once())
            ->method('updateTemplate')
            ->with(3, '업데이트', '<p>본문</p>', '127.0.0.1');
        $repository->expects($this->once())
            ->method('deleteTemplate')
            ->with(2)
            ->willReturn(1);
        $repository->expects($this->once())
            ->method('listRecipients')
            ->with(2, 1000, null, null, null, null, null, null, null, false)
            ->willReturn([
                'total' => 1,
                'items' => [['mb_id' => 'neo1']],
            ]);

        $service = $this->createService($repository);
        $admin = ['mb_level' => 10, 'mb_id' => 'super'];

        $listed = $service->listAdmin($admin, ['page' => 2, 'per_page' => 10]);
        $this->assertSame(2, $listed['pagination']['page']);

        $updated = $service->updateAdmin($admin, 3, [
            'ma_subject' => '업데이트',
            'ma_content' => '<p>본문</p>',
        ], '127.0.0.1');
        $this->assertSame(3, $updated['ma_id']);

        $service->deleteAdmin($admin, 2);

        $recipients = $service->recipients($admin, [
            'page' => 2,
            'per_page' => 2000,
            'mailling_only' => false,
        ]);
        $this->assertSame(1000, $recipients['pagination']['per_page']);
    }

    private function createService(AdminMailRepository $repository): AdminMailService
    {
        return new AdminMailService(
            new AdminMailQueryService($repository),
            new AdminMailDispatchService($repository),
            new \Api\Admin\Mail\Service\AdminMailTemplateService($repository)
        );
    }
}
