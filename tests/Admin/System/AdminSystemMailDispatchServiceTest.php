<?php

declare(strict_types=1);

namespace Tests\Admin\System;

use Api\Admin\System\Repository\AdminSystemRepository;
use Api\Admin\System\Service\AdminSystemMailDispatchService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminSystemMailDispatchServiceTest extends TestCase
{
    public function testSendMailTestRejectsInvalidRecipient(): void
    {
        $service = new AdminSystemMailDispatchService($this->createMock(AdminSystemRepository::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('to 이메일 형식이 올바르지 않습니다.');

        $service->sendMailTest([
            'to' => 'not-an-email',
            'subject' => '테스트 메일',
            'content' => '본문',
        ], '127.0.0.1');
    }

    public function testSendMailTestReturnsLogId(): void
    {
        $repository = $this->createMock(AdminSystemRepository::class);
        $repository->expects($this->once())
            ->method('createMailTestRecord')
            ->with(
                '[TEST] 테스트 메일',
                '본문',
                '127.0.0.1',
                $this->callback(static function (array $meta): bool {
                    return ($meta['to'] ?? null) === 'tester@example.com'
                        && ($meta['kind'] ?? null) === 'sendmail_test'
                        && is_string($meta['created_at'] ?? null);
                })
            )
            ->willReturn(42);

        $service = new AdminSystemMailDispatchService($repository);
        $result = $service->sendMailTest([
            'to' => 'tester@example.com',
            'subject' => '테스트 메일',
            'content' => '본문',
        ], '127.0.0.1');

        $this->assertTrue($result['sent']);
        $this->assertSame(42, $result['mail_log_id']);
        $this->assertSame('tester@example.com', $result['to']);
    }
}
