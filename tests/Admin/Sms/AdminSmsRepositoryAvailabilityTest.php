<?php

declare(strict_types=1);

namespace Tests\Admin\Sms;

use Api\Admin\Sms\Repository\AdminSmsRepository;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\Exception\ApiException;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class AdminSmsRepositoryAvailabilityTest extends TestCase
{
    public function testGetConfigSeedsDatetimeWithCurrentTimestampWhenRowIsMissing(): void
    {
        $queryBuilder = $this->createMock(QueryBuilder::class);
        $queryBuilder
            ->method('executeQuery')
            ->willReturnCallback(function (string $sql, array $params = []): Result {
                $result = $this->createMock(Result::class);

                if (str_contains($sql, 'information_schema.TABLES')) {
                    self::assertSame('g5_sms5_config', $params['table_name'] ?? null);
                    $result->method('fetchAssociative')->willReturn(['cnt' => 1]);

                    return $result;
                }

                if (str_contains($sql, 'SELECT cf_phone FROM g5_sms5_config LIMIT 1')) {
                    $result->method('fetchAssociative')->willReturn(false);

                    return $result;
                }

                if (str_contains($sql, 'LEFT JOIN g5_sms5_config s ON 1=1')) {
                    $result->method('fetchAssociative')->willReturn([
                        'cf_title' => 'SMS',
                        'cf_sms_use' => '1',
                        'cf_sms_type' => 'LMS',
                        'cf_icode_id' => '',
                        'cf_icode_pw' => '',
                        'cf_icode_server_ip' => '',
                        'cf_icode_server_port' => '',
                        'cf_icode_token_key' => '',
                        'cf_phone' => '',
                        'cf_datetime' => '2026-03-06 22:11:12',
                    ]);

                    return $result;
                }

                self::fail('Unexpected query: ' . $sql);
            });

        $queryBuilder
            ->expects(self::once())
            ->method('executeStatement')
            ->with(
                self::callback(static function (string $sql): bool {
                    return str_contains($sql, 'INSERT INTO g5_sms5_config')
                        && str_contains($sql, ':cf_datetime');
                }),
                self::callback(static function (array $params): bool {
                    return array_key_exists('cf_phone', $params)
                        && $params['cf_phone'] === ''
                        && is_string($params['cf_datetime'])
                        && preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $params['cf_datetime']) === 1;
                }),
                []
            )
            ->willReturn(1);

        $repository = new AdminSmsRepository($queryBuilder, new TableRegistry('g5_'));
        $config = $repository->getConfig();

        self::assertTrue($config['storage_ready']);
        self::assertSame('2026-03-06 22:11:12', $config['cf_datetime']);
    }

    public function testListTemplateGroupsReturnsServiceUnavailableWhenSmsTablesAreMissing(): void
    {
        $queryBuilder = $this->createMock(QueryBuilder::class);
        $queryBuilder
            ->method('executeQuery')
            ->willReturnCallback(function (string $sql, array $params = []): Result {
                $result = $this->createMock(Result::class);

                if (str_contains($sql, 'information_schema.TABLES')) {
                    $tableName = (string)($params['table_name'] ?? '');
                    $count = in_array($tableName, ['g5_sms5_form', 'g5_sms5_form_group'], true) ? 0 : 1;
                    $result->method('fetchAssociative')->willReturn(['cnt' => $count]);

                    return $result;
                }

                self::fail('Unexpected query: ' . $sql);
            });

        $repository = new AdminSmsRepository($queryBuilder, new TableRegistry('g5_'));

        try {
            $repository->listTemplateGroups();
            self::fail('Expected ApiException was not thrown.');
        } catch (ApiException $exception) {
            self::assertSame(503, $exception->getStatusCode());
            self::assertStringContainsString('g5_sms5_form', $exception->getMessage());
            self::assertStringContainsString('g5_sms5_form_group', $exception->getMessage());
        }
    }
}
