<?php

declare(strict_types=1);

namespace Tests\Admin\Dev;

use Api\Admin\Dev\Support\DbTableObservationBuilder;
use Api\Core\Database\QueryBuilder;
use PHPUnit\Framework\TestCase;

final class DbTableObservationBuilderTest extends TestCase
{
    public function testBuildReturnsBlockedWhenIntrospectionQueryFails(): void
    {
        $queryBuilder = $this->createMock(QueryBuilder::class);
        $queryBuilder
            ->method('executeQuery')
            ->willThrowException(new \RuntimeException('connection failed'));

        $builder = new DbTableObservationBuilder($queryBuilder);

        $result = $builder->build('g5_config');

        self::assertSame('blocked', $result['status']);
        self::assertSame('g5_config', $result['table']);
        self::assertStringContainsString('DB introspection 쿼리 실행에 실패했습니다', (string)($result['reason'] ?? ''));
    }

    public function testBuildReturnsBlockedWhenTableIsBlank(): void
    {
        $builder = new DbTableObservationBuilder($this->createMock(QueryBuilder::class));

        $result = $builder->build('');

        self::assertSame('blocked', $result['status']);
        self::assertSame('', $result['table']);
        self::assertStringContainsString('table 값이 비어 있습니다', (string)($result['reason'] ?? ''));
    }

    public function testBuildReturnsBlockedWhenTableNameIsInvalid(): void
    {
        $builder = new DbTableObservationBuilder($this->createMock(QueryBuilder::class));

        $result = $builder->build('g5_config;drop table');

        self::assertSame('blocked', $result['status']);
        self::assertStringContainsString('지원하지 않는 테이블명 형식', (string)($result['reason'] ?? ''));
    }
}
