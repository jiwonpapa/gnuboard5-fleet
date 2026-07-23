<?php

declare(strict_types=1);

namespace Tests\Member;

use Api\Core\Plugin\EventDispatcher;
use Api\Integration\Contracts\AuthIdentityGateway;
use Api\Integration\Contracts\MemberGateway;
use PHPUnit\Framework\TestCase;
use Tests\Support\BuildsDomainServices;

final class MemberEventDispatchTest extends TestCase
{
    use BuildsDomainServices;

    public function testUpdateMyProfileDispatchesMemberUpdatedEvent(): void
    {
        $memberGateway = $this->createMock(MemberGateway::class);
        $memberGateway->expects($this->exactly(2))
            ->method('findById')
            ->with('user1')
            ->willReturnOnConsecutiveCalls(
                [
                    'mb_id' => 'user1',
                    'mb_password' => password_hash('current-pass', PASSWORD_DEFAULT),
                ],
                [
                    'mb_id' => 'user1',
                    'mb_name' => '홍길동',
                    'mb_nick' => '길동',
                    'mb_email' => 'user1@example.com',
                    'mb_level' => 2,
                    'mb_point' => 120,
                    'mb_homepage' => 'https://updated.example.com',
                    'mb_zip1' => '',
                    'mb_zip2' => '',
                    'mb_addr1' => '',
                    'mb_addr2' => '',
                ]
            );
        $memberGateway->method('verifyPassword')->willReturn(true);
        $memberGateway->expects($this->once())
            ->method('update')
            ->with('user1', ['mb_homepage' => 'https://updated.example.com']);

        $events = new EventDispatcher();
        $captured = [];
        $events->listen('member.updated', static function (array $payload) use (&$captured): array {
            $captured = $payload;

            return $payload;
        });

        $service = $this->createMemberService(
            $memberGateway,
            $this->createMock(AuthIdentityGateway::class),
            null,
            null,
            null,
            null,
            $events
        );
        $service->updateMyProfile(
            ['mb_id' => 'user1'],
            [
                'mb_password_current' => 'current-pass',
                'mb_homepage' => 'https://updated.example.com',
            ]
        );

        $this->assertSame('user1', $captured['member_id'] ?? null);
        $this->assertSame(['mb_homepage'], $captured['changed_fields'] ?? null);
    }
}
