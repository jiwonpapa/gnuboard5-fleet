<?php

declare(strict_types=1);

namespace Tests\Device;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Device\Repository\DeviceRepository;
use Api\Device\Service\DeviceService;
use Api\Support\Exception\ApiException;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class DeviceServiceTest extends TestCase
{
    protected function setUp(): void
    {
        $this->resetTableReady(DeviceRepository::class);
    }

    public function testRegisterRequiresAuthenticatedMember(): void
    {
        $service = new DeviceService($this->createRepository($this->createMock(QueryBuilder::class)));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('인증 토큰이 필요합니다.');

        $service->register([], ['token' => 'push-token', 'platform' => 'fcm']);
    }

    public function testRegisterRejectsInvalidPlatform(): void
    {
        $service = new DeviceService($this->createRepository($this->createMock(QueryBuilder::class)));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('platform은 fcm 또는 apns만 허용됩니다.');

        $service->register(['mb_id' => 'member1'], ['token' => 'push-token', 'platform' => 'web']);
    }

    public function testRegisterReturnsSavedPayload(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeStatement')
            ->willReturnOnConsecutiveCalls(0, 1);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult([
                'pd_id' => 7,
                'mb_id' => 'member1',
                'pd_token' => 'push-token',
                'pd_platform' => 'fcm',
                'pd_active' => 1,
                'pd_datetime' => '2026-03-06 12:40:00',
            ]));

        $service = new DeviceService($this->createRepository($qb));
        $result = $service->register(
            ['mb_id' => 'member1'],
            ['token' => 'push-token', 'platform' => 'fcm']
        );

        $this->assertSame(7, $result['pd_id']);
        $this->assertSame('member1', $result['mb_id']);
        $this->assertSame('fcm', $result['pd_platform']);
        $this->assertSame(1, $result['pd_active']);
    }

    public function testUnregisterThrowsWhenTokenNotFound(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeStatement')
            ->willReturnOnConsecutiveCalls(0, 0);

        $service = new DeviceService($this->createRepository($qb));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('등록된 디바이스 토큰이 없습니다.');

        $service->unregister(['mb_id' => 'member1'], 'push-token');
    }

    private function createRepository(QueryBuilder $qb): DeviceRepository
    {
        return new DeviceRepository($qb, new TableRegistry('g5_'));
    }

    private function createResult(array|false $assoc): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);

        return $result;
    }

    private function resetTableReady(string $className): void
    {
        $property = new \ReflectionProperty($className, 'tableReady');
        $property->setValue(null, false);
    }
}
