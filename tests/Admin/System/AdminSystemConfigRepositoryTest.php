<?php

declare(strict_types=1);

namespace Tests\Admin\System;

use Api\Admin\System\Repository\AdminSystemConfigRepository;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class AdminSystemConfigRepositoryTest extends TestCase
{
    public function testGetThemeConfigFallsBackWhenMobileThemeColumnIsMissing(): void
    {
        $queryBuilder = $this->createMock(QueryBuilder::class);
        $queryBuilder
            ->method('executeQuery')
            ->willReturnCallback(function (string $sql, array $params = []): Result {
                $result = $this->createMock(Result::class);

                if (str_contains($sql, 'information_schema.COLUMNS')) {
                    self::assertSame('g5_config', $params['table_name']);
                    self::assertSame('cf_mobile_theme', $params['column_name']);
                    $result->method('fetchAssociative')->willReturn(['cnt' => 0]);

                    return $result;
                }

                self::assertStringContainsString("SELECT cf_theme, '' AS cf_mobile_theme", $sql);
                $result->method('fetchAssociative')->willReturn([
                    'cf_theme' => 'basic',
                    'cf_mobile_theme' => '',
                ]);

                return $result;
            });

        $repository = new AdminSystemConfigRepository($queryBuilder, new TableRegistry('g5_'));
        $config = $repository->getThemeConfig();

        self::assertSame('basic', $config['cf_theme']);
        self::assertSame('', $config['cf_mobile_theme']);
    }

    public function testUpdateThemeConfigSkipsMissingMobileThemeColumn(): void
    {
        $queryBuilder = $this->createMock(QueryBuilder::class);
        $queryBuilder
            ->expects(self::once())
            ->method('executeStatement')
            ->with(
                self::callback(static function (string $sql): bool {
                    return str_contains($sql, 'SET cf_theme = :cf_theme')
                        && !str_contains($sql, 'cf_mobile_theme');
                }),
                ['cf_theme' => 'basic']
            )
            ->willReturn(1);
        $queryBuilder
            ->method('executeQuery')
            ->willReturnCallback(function (string $sql): Result {
                $result = $this->createMock(Result::class);
                self::assertStringContainsString('information_schema.COLUMNS', $sql);
                $result->method('fetchAssociative')->willReturn(['cnt' => 0]);

                return $result;
            });

        $repository = new AdminSystemConfigRepository($queryBuilder, new TableRegistry('g5_'));
        $affected = $repository->updateThemeConfig('basic', 'mobile-basic');

        self::assertSame(1, $affected);
    }

    public function testInitialQaConfigInsertPreservesLegacyExtraFields(): void
    {
        $queryBuilder = $this->createMock(QueryBuilder::class);
        $queryBuilder->expects(self::once())
            ->method('executeQuery')
            ->with('SELECT * FROM g5_qa_config ORDER BY qa_id ASC LIMIT 1')
            ->willReturnCallback(function (): Result {
                $result = $this->createMock(Result::class);
                $result->method('fetchAssociative')->willReturn(false);

                return $result;
            });
        $queryBuilder->expects(self::once())
            ->method('executeStatement')
            ->with(
                self::callback(static fn (string $sql): bool => str_contains($sql, 'qa_1_subj')
                    && str_contains($sql, 'qa_1')),
                self::callback(static fn (array $params): bool => ($params['qa_id'] ?? null) === 1
                    && ($params['qa_1_subj'] ?? null) === '여분 제목'
                    && ($params['qa_1'] ?? null) === '여분 값')
            )
            ->willReturn(1);

        $repository = new AdminSystemConfigRepository($queryBuilder, new TableRegistry('g5_'));
        $affected = $repository->updateQaConfig([
            'qa_title' => '문의',
            'qa_1_subj' => '여분 제목',
            'qa_1' => '여분 값',
        ]);

        self::assertSame(1, $affected);
    }
}
