<?php

declare(strict_types=1);

namespace Tests\Auth;

use Api\Auth\External\Repository\ExternalAuthLinkRepository;
use Api\Auth\External\Service\ExternalAuthLinkManagementService;
use Api\Auth\External\Support\ExternalAuthRequestTokenCodec;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Exception\ApiException;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class ExternalAuthLinkManagementServiceTest extends TestCase
{
    protected function setUp(): void
    {
        $this->resetTableReady();
    }

    public function testLinkRequiresAuthenticatedMember(): void
    {
        $service = new ExternalAuthLinkManagementService(
            $this->createRepositoryForList([]),
            new ExternalAuthRequestTokenCodec('link-secret', 600)
        );

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('인증 토큰이 필요합니다.');

        $service->link([], 'fake', 'token');
    }

    public function testLinkSavesExternalAccountForAuthenticatedMember(): void
    {
        $codec = new ExternalAuthRequestTokenCodec('link-secret', 600);
        $linkToken = $codec->issue([
            'kind' => 'external_transition',
            'provider' => 'fake',
            'flow' => 'login',
            'provider_user_id' => 'fake-user-001',
            'provider_email' => 'fake-user@example.com',
            'provider_profile' => [
                'provider_user_id' => 'fake-user-001',
                'email' => 'fake-user@example.com',
                'display_name' => 'Fake User',
            ],
        ]);

        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeStatement')
            ->willReturnOnConsecutiveCalls(0, 1);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnOnConsecutiveCalls(
                $this->createResult(false),
                $this->createResult([
                    'link_id' => 1,
                    'provider' => 'fake',
                    'provider_user_id' => 'fake-user-001',
                    'mb_id' => 'member1',
                    'provider_email' => 'fake-user@example.com',
                    'provider_profile_json' => '{"provider_user_id":"fake-user-001","email":"fake-user@example.com","display_name":"Fake User"}',
                    'linked_at' => '2026-03-07 14:00:00',
                    'updated_at' => '2026-03-07 14:00:00',
                ])
            );

        $service = new ExternalAuthLinkManagementService(
            new ExternalAuthLinkRepository($qb, new TableRegistry('g5_')),
            $codec
        );

        $result = $service->link(['mb_id' => 'member1'], 'fake', $linkToken);

        self::assertSame(1, $result['link_id'] ?? null);
        self::assertSame('member1', $result['mb_id'] ?? null);
        self::assertSame('fake-user-001', $result['provider_user_id'] ?? null);
        self::assertSame('fake-user@example.com', $result['provider_email'] ?? null);
    }

    public function testLinkRejectsWhenAlreadyConnectedToAnotherMember(): void
    {
        $codec = new ExternalAuthRequestTokenCodec('link-secret', 600);
        $linkToken = $codec->issue([
            'kind' => 'external_link',
            'provider' => 'fake',
            'provider_user_id' => 'fake-user-001',
        ]);

        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeStatement')
            ->willReturn(0);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult([
                'link_id' => 1,
                'provider' => 'fake',
                'provider_user_id' => 'fake-user-001',
                'mb_id' => 'other-member',
            ]));

        $service = new ExternalAuthLinkManagementService(
            new ExternalAuthLinkRepository($qb, new TableRegistry('g5_')),
            $codec
        );

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('이미 다른 회원에 연결된 외부 계정입니다.');

        $service->link(['mb_id' => 'member1'], 'fake', $linkToken);
    }

    public function testListMineReturnsSerializedLinks(): void
    {
        $service = new ExternalAuthLinkManagementService(
            $this->createRepositoryForList([
                [
                    'link_id' => 10,
                    'provider' => 'fake',
                    'provider_user_id' => 'fake-user-001',
                    'mb_id' => 'member1',
                    'provider_email' => 'fake-user@example.com',
                    'provider_profile_json' => '{"display_name":"Fake User"}',
                    'linked_at' => '2026-03-07 14:00:00',
                    'updated_at' => '2026-03-07 14:10:00',
                ],
            ]),
            new ExternalAuthRequestTokenCodec('link-secret', 600)
        );

        $links = $service->listMine(['mb_id' => 'member1']);

        self::assertCount(1, $links);
        self::assertSame('fake', $links[0]['provider'] ?? null);
        self::assertSame('Fake User', $links[0]['provider_profile']['display_name'] ?? null);
    }

    public function testUnlinkThrowsWhenLinkMissing(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeStatement')
            ->willReturnOnConsecutiveCalls(0, 0);

        $service = new ExternalAuthLinkManagementService(
            new ExternalAuthLinkRepository($qb, new TableRegistry('g5_')),
            new ExternalAuthRequestTokenCodec('link-secret', 600)
        );

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('해당 외부 인증 연결을 찾을 수 없습니다.');

        $service->unlink(['mb_id' => 'member1'], 'fake', 'missing-user');
    }

    private function createRepositoryForList(array $rows): ExternalAuthLinkRepository
    {
        $this->resetTableReady();

        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeStatement')->willReturn(0);
        $qb->method('executeQuery')->willReturn($this->createResult(false, $rows));

        return new ExternalAuthLinkRepository($qb, new TableRegistry('g5_'));
    }

    private function createResult(array|false $assoc, array $all = []): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);
        $result->method('fetchAllAssociative')->willReturn($all);

        return $result;
    }

    private function resetTableReady(): void
    {
        $property = new \ReflectionProperty(ExternalAuthLinkRepository::class, 'tableReady');
        $property->setValue(null, false);
    }
}
