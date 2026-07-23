<?php

declare(strict_types=1);

namespace Tests\Admin\Auth;

use Api\Admin\Auth\Repository\AdminAuthRepository;
use Api\Admin\Auth\Service\AdminAuthService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminAuthServiceTest extends TestCase
{
    public function testListRequiresSuperAdmin(): void
    {
        $service = new AdminAuthService($this->createMock(AdminAuthRepository::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('최고관리자만 접근할 수 있습니다.');

        $service->list(['mb_level' => 9], []);
    }

    public function testUpsertNormalizesAuthRows(): void
    {
        $repository = $this->createMock(AdminAuthRepository::class);
        $repository->expects($this->once())
            ->method('findMember')
            ->with('manager01')
            ->willReturn([
                'mb_id' => 'manager01',
                'mb_name' => '관리자',
                'mb_nick' => '매니저',
            ]);
        $repository->expects($this->once())
            ->method('replaceMemberAuth')
            ->with(
                'manager01',
                [
                    ['au_menu' => '100100', 'au_auth' => 'r,w'],
                    ['au_menu' => '200100', 'au_auth' => 'r,d'],
                ]
            );

        $service = new AdminAuthService($repository);
        $result = $service->upsert('manager01', [
            'auths' => [
                ['au_menu' => '100100', 'au_auth' => 'wr'],
                ['au_menu' => '200100', 'au_auth' => 'rdd'],
            ],
        ], [
            'mb_level' => 10,
            'mb_id' => 'super',
        ]);

        $this->assertSame('manager01', $result['mb_id']);
        $this->assertSame('관리자', $result['mb_name']);
        $this->assertCount(2, $result['auths']);
    }

    public function testListBindsMemberRegistrationDateRange(): void
    {
        $repository = $this->createMock(AdminAuthRepository::class);
        $repository->expects($this->once())
            ->method('list')
            ->with(2, 10, 'manager01', '2026-07-01', '2026-07-15')
            ->willReturn([
                'total' => 1,
                'items' => [[
                    'mb_id' => 'manager01',
                    'mb_name' => '관리자',
                    'mb_nick' => '매니저',
                    'au_menu' => '100100',
                    'au_auth' => 'r,w',
                ]],
            ]);

        $result = (new AdminAuthService($repository))->list(
            ['mb_level' => 10],
            [
                'page' => 2,
                'per_page' => 10,
                'mb_id' => 'manager01',
                'date_from' => '2026-07-01',
                'date_to' => '2026-07-15',
            ]
        );

        $this->assertSame('manager01', $result['items'][0]['mb_id']);
    }

    public function testUpsertRejectsUnknownField(): void
    {
        $repository = $this->createMock(AdminAuthRepository::class);
        $repository->method('findMember')->willReturn([
            'mb_id' => 'manager01',
            'mb_name' => '관리자',
            'mb_nick' => '매니저',
        ]);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('허용되지 않은 필드');

        (new AdminAuthService($repository))->upsert(
            'manager01',
            ['au_menu' => '100100', 'au_auth' => 'rw', 'unknown' => true],
            ['mb_level' => 10]
        );
    }

    public function testDeleteByMemberRejectsSelfDelete(): void
    {
        $service = new AdminAuthService($this->createMock(AdminAuthRepository::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('자기 자신의 권한은 삭제할 수 없습니다.');

        $service->deleteByMember('admin01', [
            'mb_level' => 10,
            'mb_id' => 'admin01',
        ]);
    }
}
