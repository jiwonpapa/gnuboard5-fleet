<?php

declare(strict_types=1);

namespace Tests\Admin\Group;

use Api\Admin\Group\Repository\AdminGroupRepository;
use Api\Admin\Group\Service\AdminGroupService;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Exception\ApiException;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class AdminGroupServiceTest extends TestCase
{
    public function testCreateRejectsDuplicateGroup(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult([
                'gr_id' => 'group1',
                'gr_subject' => '커뮤니티',
            ]));

        $service = new AdminGroupService($this->createRepository($qb));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('이미 존재하는 그룹입니다.');

        $service->create([
            'gr_id' => 'group1',
            'gr_subject' => '커뮤니티',
        ]);
    }

    public function testListMembersBuildsPagination(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(3))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult([
                    'gr_id' => 'group1',
                    'gr_subject' => '커뮤니티',
                ]),
                $this->createResult(['cnt' => 5]),
                $this->createResult(
                    false,
                    [
                        ['mb_id' => 'neo1'],
                        ['mb_id' => 'neo2'],
                    ]
                )
            );

        $service = new AdminGroupService($this->createRepository($qb));
        $result = $service->listMembers('group1', [
            'page' => 2,
            'per_page' => 2,
            'search' => 'neo',
        ]);

        $this->assertCount(2, $result['items']);
        $this->assertSame(5, $result['pagination']['total']);
        $this->assertSame(3, $result['pagination']['last_page']);
        $this->assertTrue($result['pagination']['has_next']);
        $this->assertTrue($result['pagination']['has_prev']);
    }

    public function testAddMemberRejectsAlreadyAssignedMember(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(3))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult([
                    'gr_id' => 'group1',
                    'gr_subject' => '커뮤니티',
                ]),
                $this->createResult(['cnt' => 1]),
                $this->createResult(['cnt' => 1])
            );

        $service = new AdminGroupService($this->createRepository($qb));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('이미 그룹에 등록된 회원입니다.');

        $service->addMember('group1', ['mb_id' => 'member1']);
    }

    public function testUpdateSupportsLegacyParityFields(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult([
                    'gr_id' => 'group1',
                    'gr_subject' => '커뮤니티',
                ]),
                $this->createResult([
                    'gr_id' => 'group1',
                    'gr_subject' => '커뮤니티',
                    'gr_admin' => 'neo',
                    'gr_device' => 'mobile',
                    'gr_use_access' => '1',
                ])
            );
        $qb->expects($this->once())
            ->method('executeStatement')
            ->with(
                $this->callback(static function (string $sql): bool {
                    return str_contains($sql, 'gr_subject = :u_gr_subject')
                        && str_contains($sql, 'gr_admin = :u_gr_admin')
                        && str_contains($sql, 'gr_device = :u_gr_device')
                        && str_contains($sql, 'gr_use_access = :u_gr_use_access');
                }),
                $this->callback(static function (array $params): bool {
                    return ($params['gr_id'] ?? null) === 'group1'
                        && ($params['u_gr_subject'] ?? null) === '커뮤니티'
                        && ($params['u_gr_admin'] ?? null) === 'neo'
                        && ($params['u_gr_device'] ?? null) === 'mobile'
                        && ($params['u_gr_use_access'] ?? null) === 1;
                })
            )
            ->willReturn(1);

        $service = new AdminGroupService($this->createRepository($qb));
        $result = $service->update('group1', [
            'gr_subject' => '커뮤니티',
            'gr_admin' => 'neo',
            'gr_device' => 'mobile',
            'gr_use_access' => 1,
        ]);

        $this->assertSame('neo', $result['gr_admin']);
        $this->assertSame('mobile', $result['gr_device']);
        $this->assertSame(1, $result['gr_use_access']);
    }

    public function testCreateRejectsUndeclaredField(): void
    {
        $service = new AdminGroupService($this->createRepository($this->createMock(QueryBuilder::class)));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('허용되지 않은 필드');

        $service->create([
            'gr_id' => 'group1',
            'gr_subject' => '커뮤니티',
            'gr_order' => 10,
        ]);
    }

    public function testCreateRejectsBooleanAccessFlagOutsideIntegerContract(): void
    {
        $service = new AdminGroupService($this->createRepository($this->createMock(QueryBuilder::class)));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('0 또는 1');

        $service->create([
            'gr_id' => 'group1',
            'gr_subject' => '커뮤니티',
            'gr_use_access' => true,
        ]);
    }

    private function createRepository(QueryBuilder $qb): AdminGroupRepository
    {
        return new AdminGroupRepository($qb, new TableRegistry('g5_'));
    }

    private function createResult(array|false $assoc, array $all = []): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);
        $result->method('fetchAllAssociative')->willReturn($all);

        return $result;
    }
}
