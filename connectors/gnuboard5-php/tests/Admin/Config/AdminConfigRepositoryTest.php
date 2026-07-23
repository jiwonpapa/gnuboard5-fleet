<?php

declare(strict_types=1);

namespace Tests\Admin\Config;

use Api\Admin\Config\Repository\AdminConfigRepository;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use PHPUnit\Framework\TestCase;

final class AdminConfigRepositoryTest extends TestCase
{
    public function testUpdateConfigSupportsLegacyParityFields(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects(self::once())
            ->method('executeStatement')
            ->with(
                self::callback(static function (string $sql): bool {
                    return str_contains($sql, 'cf_admin = :u_cf_admin')
                        && str_contains($sql, 'cf_cert_kcp_enckey = :u_cf_cert_kcp_enckey')
                        && str_contains($sql, 'cf_social_servicelist = :u_cf_social_servicelist')
                        && str_contains($sql, 'cf_icon_level = :u_cf_icon_level')
                        && str_contains($sql, 'cf_1_subj = :u_cf_1_subj')
                        && str_contains($sql, 'cf_1 = :u_cf_1')
                        && str_contains($sql, 'cf_email_use = :u_cf_email_use')
                        && str_contains($sql, 'cf_member_icon_width = :u_cf_member_icon_width')
                        && str_contains($sql, 'cf_use_profile = :u_cf_use_profile')
                        && str_contains($sql, 'cf_write_pages = :u_cf_write_pages');
                }),
                [
                    'u_cf_admin' => 'admin',
                    'u_cf_cert_kcp_enckey' => 'enc-key',
                    'u_cf_social_servicelist' => 'naver,kakao',
                    'u_cf_icon_level' => 7,
                    'u_cf_1_subj' => '여분 제목',
                    'u_cf_1' => '여분 값',
                    'u_cf_email_use' => '1',
                    'u_cf_member_icon_width' => 80,
                    'u_cf_use_profile' => '1',
                    'u_cf_write_pages' => 10,
                ]
            )
            ->willReturn(1);

        $repository = new AdminConfigRepository($qb, new TableRegistry('g5_'));
        $affected = $repository->updateConfig([
            'cf_admin' => 'admin',
            'cf_cert_kcp_enckey' => 'enc-key',
            'cf_social_servicelist' => 'naver,kakao',
            'cf_icon_level' => 7,
            'cf_1_subj' => '여분 제목',
            'cf_1' => '여분 값',
            'cf_email_use' => '1',
            'cf_member_icon_width' => 80,
            'cf_use_profile' => '1',
            'cf_write_pages' => 10,
        ]);

        self::assertSame(1, $affected);
    }
}
