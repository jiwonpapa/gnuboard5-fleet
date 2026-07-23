<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Auth\Repository\AuthMemberLookupRepository;
use Api\Auth\Repository\AuthMemberPolicyRepository;
use Api\Core\Config\EnvConfig;
use Api\Core\Config\G5Config;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class AuthMemberRepositoriesTest extends TestCase
{
    public function testLookupRepositoryFindsMemberByIdAndCountsEmail(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createAssocResult([
                    'mb_id' => 'neo1',
                    'mb_email' => 'neo@example.com',
                    'mb_leave_date' => '',
                    'mb_intercept_date' => '',
                ]),
                $this->createAssocResult(['cnt' => 2])
            );

        $repository = new AuthMemberLookupRepository($qb, new TableRegistry('g5_'));

        $member = $repository->findMemberById('neo1');

        self::assertSame('neo1', $member['mb_id'] ?? null);
        self::assertSame(2, $repository->countMembersByEmail('neo@example.com'));
    }

    public function testPolicyRepositoryMergesReservedWordsAndDetectsReservedNick(): void
    {
        $repository = new AuthMemberPolicyRepository(
            $this->createMock(QueryBuilder::class),
            new TableRegistry('g5_'),
            null,
            $this->createConfigReader([
                'cf_prohibit_id' => "admin\nmanager",
                'cf_prohibit_email' => "blocked.com|legacy.test",
            ]),
            $this->createEnvConfig()
        );

        self::assertSame(
            ['admin', 'manager', 'root', 'sysop'],
            $repository->mergedProhibitMemberIds()
        );
        self::assertSame(
            ['blocked.com', 'legacy.test', 'tempmail.test'],
            $repository->mergedProhibitEmailDomains()
        );
        self::assertTrue($repository->isReservedNick('sysop'));
        self::assertFalse($repository->isReservedNick('neo1'));
    }

    /**
     * @param array<string,mixed> $row
     */
    private function createConfigReader(array $row): G5Config
    {
        $qb = $this->createMock(QueryBuilder::class);
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($row);
        $qb->method('executeQuery')->willReturn($result);

        return new G5Config($qb, new TableRegistry('g5_'));
    }

    /**
     * @param array<string,mixed>|false $assoc
     */
    private function createAssocResult(array|false $assoc): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);
        $result->method('fetchAllAssociative')->willReturn([]);

        return $result;
    }

    private function createEnvConfig(): EnvConfig
    {
        return new EnvConfig(
            filePermission: 0644,
            dirPermission: 0755,
            encryptFunc: 'create_hash',
            dataPath: sys_get_temp_dir() . '/g5-api-auth-member',
            nicknameCooldownDays: 30,
            passwordResetUrl: '',
            emailVerifyUrl: '',
            uploadImageExtensions: 'jpg|jpeg|png|gif|webp|bmp',
            uploadFlashExtensions: 'swf',
            loginFailMaxAttempts: 5,
            loginFailWindowSeconds: 300,
            authExposeSensitiveTokens: false,
            authMailSendEnabled: false,
            authMailSubjectPrefix: '[G5 API]',
            authMailFrom: 'no-reply@example.com',
            authRegisterNotifyAdminEmail: '',
            authAutoRehashOnLogin: true,
            authPasswordResetTtlSeconds: 1800,
            authEmailVerifyTtlSeconds: 86400,
            unknownIpFallback: 'unknown',
            prohibitMemberIds: 'root,sysop',
            prohibitEmailDomains: 'tempmail.test',
            prohibitMemberNicks: 'sysop',
            pluginBoardRewardEnableGrant: false
        );
    }
}
