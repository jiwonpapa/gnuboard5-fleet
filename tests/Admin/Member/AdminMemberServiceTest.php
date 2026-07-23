<?php

declare(strict_types=1);

namespace Tests\Admin\Member;

use Api\Admin\Member\Repository\AdminMemberRepository;
use Api\Admin\Member\Service\AdminMemberImageService;
use Api\Admin\Member\Service\AdminMemberMutationService;
use Api\Admin\Member\Service\AdminMemberQueryService;
use Api\Admin\Member\Service\AdminMemberService;
use Api\Core\Config\EnvConfig;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Member\Service\MemberImageManager;
use Api\Support\Exception\ApiException;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class AdminMemberServiceTest extends TestCase
{
    public function testListBuildsPagination(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(['cnt' => 25]),
                $this->createResult(
                    false,
                    [
                        ['mb_id' => 'neo1'],
                        ['mb_id' => 'neo2'],
                    ]
                )
            );

        $service = $this->createService($qb);
        $result = $service->list([
            'page' => 2,
            'per_page' => 10,
            'search' => 'neo',
            'sort_by' => 'mb_level',
            'sort_direction' => 'DESC',
        ]);

        $this->assertCount(2, $result['items']);
        $this->assertSame(25, $result['pagination']['total']);
        $this->assertSame(3, $result['pagination']['last_page']);
        $this->assertTrue($result['pagination']['has_next']);
        $this->assertTrue($result['pagination']['has_prev']);
    }

    public function testListSupportsSearchFieldFilter(): void
    {
        $queries = [];
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnCallback(function (string $sql, array $params = []) use (&$queries): Result {
                $queries[] = ['sql' => $sql, 'params' => $params];

                if (str_contains($sql, 'COUNT(*) AS cnt')) {
                    return $this->createResult(['cnt' => 1]);
                }

                return $this->createResult(false, [
                    ['mb_id' => 'neo1', 'mb_email' => 'neo@example.com'],
                ]);
            });

        $service = $this->createService($qb);
        $result = $service->list([
            'search' => 'neo@example.com',
            'search_field' => 'mb_email',
        ]);

        $this->assertSame('%neo@example.com%', $queries[0]['params']['search'] ?? null);
        $this->assertStringContainsString('mb_email LIKE :search', $queries[0]['sql']);
        $this->assertStringNotContainsString('mb_nick LIKE :search OR', $queries[0]['sql']);
        $this->assertSame('neo1', $result['items'][0]['mb_id']);
    }

    public function testExportExcelSupportsSearchFieldFilter(): void
    {
        $queries = [];
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturnCallback(function (string $sql, array $params = []) use (&$queries): Result {
                $queries[] = ['sql' => $sql, 'params' => $params];

                return $this->createResult(false, [
                    ['mb_id' => 'neo1', 'mb_name' => '네오'],
                ]);
            });

        $service = $this->createService($qb);
        $result = $service->exportExcel([
            'search' => '네오',
            'search_field' => 'mb_name',
        ]);

        $this->assertSame('%네오%', $queries[0]['params']['search'] ?? null);
        $this->assertStringContainsString('mb_name LIKE :search', $queries[0]['sql']);
        $this->assertStringNotContainsString('mb_email LIKE :search', $queries[0]['sql']);
        $this->assertSame('neo1', $result[0]['mb_id']);
    }

    public function testListRejectsInvalidSearchField(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->never())->method('executeQuery');

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('search_field 값이 올바르지 않습니다.');

        $service->list([
            'search' => 'neo',
            'search_field' => 'invalid_field',
        ]);
    }

    public function testListRejectsInvalidSortDirection(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->never())->method('executeQuery');

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('sort_direction은 ASC 또는 DESC여야 합니다.');

        $service->list(['sort_direction' => 'sideways']);
    }

    public function testDetailBuildsCombinedZipFromSegments(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult([
                'mb_id' => 'neo1',
                'mb_name' => '네오',
                'mb_nick' => '네오닉',
                'mb_zip1' => '123',
                'mb_zip2' => '456',
                'mb_level' => 2,
            ]));

        $service = $this->createService($qb);
        $result = $service->detail('neo1');

        $this->assertSame('123456', $result['mb_zip']);
        $this->assertSame('123', $result['mb_zip1']);
        $this->assertSame('456', $result['mb_zip2']);
    }

    public function testUpdateRejectsSelfLevelChange(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult([
                'mb_id' => 'manager1',
                'mb_level' => 9,
                'mb_mailling' => '0',
                'mb_sms' => '0',
                'mb_marketing_agree' => '0',
                'mb_thirdparty_agree' => '0',
            ]));
        $qb->expects($this->never())->method('executeStatement');

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('본인 레벨은 수정할 수 없습니다.');

        $service->update('manager1', ['mb_level' => 8], [
            'mb_id' => 'manager1',
            'mb_level' => 9,
        ]);
    }

    public function testUpdateLevelRejectsAdminTarget(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult([
                'mb_id' => 'superman',
                'mb_level' => 10,
            ]));
        $qb->expects($this->never())->method('executeStatement');

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('최고관리자 레벨은 수정할 수 없습니다.');

        $service->updateLevel('superman', 9, [
            'mb_id' => 'manager1',
            'mb_level' => 10,
        ]);
    }

    public function testDeleteRejectsSelfDelete(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult([
                'mb_id' => 'manager1',
                'mb_level' => 9,
            ]));
        $qb->expects($this->never())->method('executeStatement');

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('본인 계정은 관리자 삭제를 사용할 수 없습니다.');

        $service->delete('manager1', [
            'mb_id' => 'manager1',
            'mb_level' => 10,
        ]);
    }

    public function testUpdateMapsLegacyZipToZipSegments(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult([
                    'mb_id' => 'neo1',
                    'mb_level' => 2,
                    'mb_mailling' => '0',
                    'mb_sms' => '0',
                    'mb_marketing_agree' => '0',
                    'mb_thirdparty_agree' => '0',
                ]),
                $this->createResult([
                    'mb_id' => 'neo1',
                    'mb_level' => 2,
                    'mb_zip1' => '123',
                    'mb_zip2' => '456',
                    'mb_mailling' => '0',
                    'mb_sms' => '0',
                    'mb_marketing_agree' => '0',
                    'mb_thirdparty_agree' => '0',
                ])
            );
        $qb->expects($this->once())
            ->method('executeStatement')
            ->with(
                $this->stringContains('mb_zip1 = :u_mb_zip1'),
                $this->callback(function (array $params): bool {
                    return ($params['u_mb_zip1'] ?? null) === '123'
                        && ($params['u_mb_zip2'] ?? null) === '456'
                        && !array_key_exists('u_mb_zip', $params);
                })
            )
            ->willReturn(1);

        $service = $this->createService($qb);
        $result = $service->update('neo1', ['mb_zip' => '123-456'], [
            'mb_id' => 'admin1',
            'mb_level' => 10,
        ]);

        $this->assertSame('123456', $result['mb_zip']);
        $this->assertSame('123', $result['mb_zip1']);
        $this->assertSame('456', $result['mb_zip2']);
    }

    public function testUpdateSupportsLegacyParityFields(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult([
                    'mb_id' => 'neo1',
                    'mb_level' => 2,
                    'mb_mailling' => '0',
                    'mb_sms' => '0',
                    'mb_marketing_agree' => '0',
                    'mb_thirdparty_agree' => '0',
                ]),
                $this->createResult([
                    'mb_id' => 'neo1',
                    'mb_level' => 2,
                    'mb_memo' => '관리자 메모',
                    'mb_profile' => '자기소개',
                    'mb_signature' => '서명',
                    'mb_adult' => '1',
                    'mb_certify' => 'simple',
                    'mb_leave_date' => '20260308',
                    'mb_mailling' => '0',
                    'mb_sms' => '0',
                    'mb_marketing_agree' => '0',
                    'mb_thirdparty_agree' => '0',
                ])
            );
        $qb->expects($this->once())
            ->method('executeStatement')
            ->with(
                $this->callback(function (string $sql): bool {
                    return str_contains($sql, 'mb_password = :u_mb_password')
                        && str_contains($sql, 'mb_memo = :u_mb_memo')
                        && str_contains($sql, 'mb_profile = :u_mb_profile')
                        && str_contains($sql, 'mb_signature = :u_mb_signature')
                        && str_contains($sql, 'mb_adult = :u_mb_adult')
                        && str_contains($sql, 'mb_certify = :u_mb_certify')
                        && str_contains($sql, 'mb_leave_date = :u_mb_leave_date')
                        && str_contains($sql, 'mb_1 = :u_mb_1')
                        && str_contains($sql, 'mb_10 = :u_mb_10');
                }),
                $this->callback(function (array $params): bool {
                    $password = (string)($params['u_mb_password'] ?? '');

                    return ($params['mb_id'] ?? null) === 'neo1'
                        && ($params['u_mb_memo'] ?? null) === '관리자 메모'
                        && ($params['u_mb_profile'] ?? null) === '자기소개'
                        && ($params['u_mb_signature'] ?? null) === '서명'
                        && ($params['u_mb_adult'] ?? null) === '1'
                        && ($params['u_mb_certify'] ?? null) === 'simple'
                        && ($params['u_mb_leave_date'] ?? null) === '20260308'
                        && ($params['u_mb_1'] ?? null) === '여분필드 1'
                        && ($params['u_mb_10'] ?? null) === '여분필드 10'
                        && str_starts_with($password, 'sha256:');
                })
            )
            ->willReturn(1);

        $service = $this->createService($qb);
        $result = $service->update('neo1', [
            'mb_password' => 'secret123!',
            'mb_memo' => '관리자 메모',
            'mb_profile' => '자기소개',
            'mb_signature' => '서명',
            'mb_adult' => true,
            'mb_certify_case' => 'simple',
            'mb_leave_date' => '2026-03-08',
            'mb_1' => '여분필드 1',
            'mb_10' => '여분필드 10',
        ], [
            'mb_id' => 'admin1',
            'mb_level' => 10,
        ]);

        $this->assertSame('관리자 메모', $result['mb_memo']);
        $this->assertSame('simple', $result['mb_certify']);
        $this->assertSame('20260308', $result['mb_leave_date']);
    }

    public function testUpdateRejectsUnknownRequestField(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult([
                'mb_id' => 'neo1',
                'mb_level' => 2,
            ]));
        $qb->expects($this->never())->method('executeStatement');

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('허용되지 않은 필드가 있습니다: mb_password_hash');

        $service->update('neo1', ['mb_password_hash' => 'do-not-accept'], [
            'mb_id' => 'admin1',
            'mb_level' => 10,
        ]);
    }

    public function testUpdateOpenFlagPersistsOpenDateAndConsentLog(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult([
                    'mb_id' => 'neo1',
                    'mb_level' => 2,
                    'mb_open' => '0',
                ]),
                $this->createResult([
                    'mb_id' => 'neo1',
                    'mb_level' => 2,
                    'mb_open' => '1',
                    'mb_open_date' => date('Y-m-d'),
                ])
            );
        $qb->expects($this->once())
            ->method('executeStatement')
            ->with(
                $this->callback(static function (string $sql): bool {
                    return str_contains($sql, 'mb_open = :u_mb_open')
                        && str_contains($sql, 'mb_open_date = :u_mb_open_date')
                        && str_contains($sql, 'mb_agree_log = CONCAT(:u_mb_agree_log_prepend');
                }),
                $this->callback(static function (array $params): bool {
                    return ($params['u_mb_open'] ?? null) === '1'
                        && ($params['u_mb_open_date'] ?? null) === date('Y-m-d')
                        && str_contains((string)($params['u_mb_agree_log_prepend'] ?? ''), '정보 공개(동의)');
                })
            )
            ->willReturn(1);

        $service = $this->createService($qb);
        $result = $service->update('neo1', ['mb_open' => 1], [
            'mb_id' => 'admin1',
            'mb_level' => 10,
        ]);

        $this->assertSame(1, $result['mb_open']);
        $this->assertSame(date('Y-m-d'), $result['mb_open_date']);
    }

    private function createRepository(QueryBuilder $qb): AdminMemberRepository
    {
        return new AdminMemberRepository($qb, new TableRegistry('g5_'));
    }

    private function createService(QueryBuilder $qb): AdminMemberService
    {
        $repository = $this->createRepository($qb);
        $imageService = new AdminMemberImageService($repository, new MemberImageManager(EnvConfig::fromEnv()));

        return new AdminMemberService(
            new AdminMemberQueryService($repository),
            new AdminMemberMutationService($repository, $imageService)
        );
    }

    private function createResult(array|false $assoc, array $all = []): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);
        $result->method('fetchAllAssociative')->willReturn($all);

        return $result;
    }
}
