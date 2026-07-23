<?php

declare(strict_types=1);

namespace Tests\Admin\Shop;

use Api\Admin\Shop\Catalog\Repository\AdminShopCatalogRepository;
use Api\Admin\Shop\Catalog\Service\AdminShopCatalogService;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Exception\ApiException;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class AdminShopCatalogServiceTest extends TestCase
{
    public function testListCategoriesUsesRepositoryTotalForPagination(): void
    {
        $queries = [];
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(3))
            ->method('executeQuery')
            ->willReturnCallback(function (string $sql) use (&$queries): Result {
                $queries[] = $sql;

                if (str_contains($sql, 'information_schema.TABLES')) {
                    return $this->createResult(['cnt' => 1]);
                }

                if (str_contains($sql, 'COUNT(*) AS cnt')) {
                    return $this->createResult(['cnt' => 25]);
                }

                return $this->createResult(false, [['ca_id' => '100']]);
            });

        $service = $this->createService($qb);
        $result = $service->listCategories([
            'page' => 2,
            'per_page' => 20,
        ]);

        $this->assertCount(1, $result['items']);
        $this->assertSame(25, $result['pagination']['total']);
        $this->assertSame(2, $result['pagination']['page']);
        $this->assertSame(20, $result['pagination']['per_page']);
        $this->assertFalse($result['pagination']['has_next']);
        $this->assertTrue($result['pagination']['has_prev']);
    }

    public function testCreateCategoryRejectsEmptyPayload(): void
    {
        $service = $this->createService($this->createMock(QueryBuilder::class));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('요청 본문이 비어 있습니다.');

        $service->createCategory([]);
    }

    public function testGetCategoryThrowsNotFoundWhenMissing(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult(['cnt' => 0]));

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('카테고리를 찾을 수 없습니다.');

        $service->getCategory(1);
    }

    public function testCreateProductRejectsDuplicateItId(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->exactly(2))
            ->method('executeQuery')
            ->willReturnCallback(function (string $sql) {
                if (str_contains($sql, 'information_schema.TABLES')) {
                    return $this->createResult(['cnt' => 1]);
                }

                return $this->createResult(['it_id' => 'A100', 'it_name' => '상품']);
            });

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('이미 존재하는 상품입니다.');

        $service->createProduct(['it_id' => 'A100', 'it_name' => '상품']);
    }

    public function testAnswerReviewThrowsNotFoundWhenReviewTableMissing(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult(['cnt' => 0]));

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('상품사용후기를 찾을 수 없습니다.');

        $service->answerReview(10, ['is_answer' => '완료']);
    }

    public function testDeleteEventThrowsNotFoundWhenMissing(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult(['cnt' => 0]));

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('이벤트를 찾을 수 없습니다.');

        $service->deleteEvent(7);
    }

    public function testUpdateProductOptionsRejectsWhenProductMissing(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')->willReturnCallback(function (string $sql, array $params = []) : Result {
            if (str_contains($sql, 'information_schema.TABLES')) {
                return $this->createResult(['cnt' => 1]);
            }

            return $this->createResult(false);
        });

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('상품을 찾을 수 없습니다.');

        $service->updateProductOptions(100, [['io_no' => 1]]);
    }

    public function testUpdateProductOptionsRejectsWhenPayloadIsEmpty(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')->willReturnCallback(function (string $sql, array $params = []) : Result {
            if (str_contains($sql, 'information_schema.TABLES')) {
                return $this->createResult(['cnt' => 1]);
            }

            if (str_contains($sql, 'SELECT * FROM g5_shop_item WHERE it_id')) {
                return $this->createResult(['it_id' => '100']);
            }

            return $this->createResult(false);
        });

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('수정할 옵션이 없습니다.');

        $service->updateProductOptions(100, []);
    }

    public function testUpdateProductOptionsRejectsWhenOptionPayloadIsInvalid(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')->willReturnCallback(function (string $sql, array $params = []) : Result {
            if (str_contains($sql, 'information_schema.TABLES')) {
                return $this->createResult(['cnt' => 1]);
            }

            if (str_contains($sql, 'SELECT * FROM g5_shop_item WHERE it_id')) {
                return $this->createResult(['it_id' => '100']);
            }

            return $this->createResult(false);
        });

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('옵션 식별자가 없습니다.');

        $service->updateProductOptions(100, [['io_stock_qty' => 1]]);
    }

    public function testUpdateProductOptionsRejectsWhenOptionNotFound(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')->willReturnCallback(function (string $sql, array $params = []) : Result {
            if (str_contains($sql, 'information_schema.TABLES')) {
                $table = (string) ($params['table_name'] ?? '');
                return $this->createResult(['cnt' => in_array($table, ['g5_shop_item', 'g5_shop_item_option'], true) ? 1 : 0]);
            }

            if (str_contains($sql, 'SELECT * FROM g5_shop_item WHERE it_id')) {
                return $this->createResult(['it_id' => '100']);
            }

            if (str_contains($sql, 'FROM g5_shop_item_option')) {
                return $this->createResult(false);
            }

            return $this->createResult(false);
        });

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('상품 옵션을 찾을 수 없습니다.');

        $service->updateProductOptions(100, [['io_no' => 1]]);
    }

    public function testUpdateProductOptionsRejectsWhenNoUpdatableField(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')->willReturnCallback(function (string $sql, array $params = []) : Result {
            if (str_contains($sql, 'information_schema.TABLES')) {
                $table = (string) ($params['table_name'] ?? '');
                return $this->createResult(['cnt' => in_array($table, ['g5_shop_item', 'g5_shop_item_option'], true) ? 1 : 0]);
            }

            if (str_contains($sql, 'SELECT * FROM g5_shop_item WHERE it_id')) {
                return $this->createResult(['it_id' => '100']);
            }

            if (str_contains($sql, 'FROM g5_shop_item_option')) {
                if (str_contains($sql, 'information_schema.COLUMNS')) {
                    return $this->createResult(false, $this->tableColumns('g5_shop_item_option'));
                }

                if (str_contains($sql, 'LIMIT 1')) {
                    return $this->createResult(['io_no' => '1', 'it_id' => '100', 'io_stock_qty' => '0']);
                }
            }

            if (str_contains($sql, 'information_schema.COLUMNS')) {
                return $this->createResult(false, $this->tableColumns('g5_shop_item_option'));
            }

            return $this->createResult(false);
        });

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('수정할 필드가 없습니다.');

        $service->updateProductOptions(100, [['io_no' => 1]]);
    }

    public function testUpdateProductOptionsReturnsUpdatedOptions(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')->willReturnCallback(function (string $sql, array $params = []) : Result {
            if (str_contains($sql, 'information_schema.TABLES')) {
                $table = (string) ($params['table_name'] ?? '');
                return $this->createResult(['cnt' => in_array($table, ['g5_shop_item', 'g5_shop_item_option'], true) ? 1 : 0]);
            }

            if (str_contains($sql, 'SELECT * FROM g5_shop_item WHERE it_id')) {
                return $this->createResult(['it_id' => '100']);
            }

            if (str_contains($sql, 'FROM g5_shop_item_option')) {
                if (str_contains($sql, 'LIMIT 1')) {
                    return $this->createResult(['io_no' => '1', 'it_id' => '100', 'io_stock_qty' => 10]);
                }

                return $this->createResult(false);
            }

            if (str_contains($sql, 'information_schema.COLUMNS')) {
                return $this->createResult(false, $this->tableColumns('g5_shop_item_option'));
            }

            return $this->createResult(false);
        });
        $qb->expects($this->once())
            ->method('executeStatement')
            ->with(
                self::stringContains('UPDATE g5_shop_item_option SET'),
                self::callback(function (array $params): bool {
                    return ($params['io_no'] ?? null) === '1'
                        && ($params['u_io_stock_qty'] ?? null) === 10
                        && ($params['it_id'] ?? null) === '100';
                })
            )
            ->willReturn(1);

        $service = $this->createService($qb);
        $updated = [
            'product_id' => '100',
            'items' => [['io_no' => '1', 'it_id' => '100', 'io_stock_qty' => 10]],
        ];
        $result = $service->updateProductOptions(100, [['io_no' => 1, 'io_stock_qty' => 10]]);

        self::assertSame($updated, $result);
    }

    public function testListStockSmsReturnsPagination(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')->willReturnCallback(function (string $sql, array $params = []) : Result {
            if (str_contains($sql, 'information_schema.TABLES')) {
                return $this->createResult(['cnt' => 1]);
            }

            if (str_contains($sql, 'COUNT(*) AS cnt')) {
                return $this->createResult(['cnt' => 2]);
            }

            if (str_contains($sql, 'FROM g5_shop_item_stocksms')) {
                return $this->createResult(false, [['ss_id' => 11, 'ss_send' => 0]]);
            }

            return $this->createResult(false);
        });

        $service = $this->createService($qb);
        $result = $service->listStockSms([
            'page' => 3,
            'per_page' => 10,
        ]);

        self::assertSame(2, $result['pagination']['total']);
        self::assertSame(3, $result['pagination']['page']);
        self::assertSame(10, $result['pagination']['per_page']);
        self::assertSame(1, $result['pagination']['last_page']);
        self::assertSame(false, $result['pagination']['has_next']);
        self::assertSame(true, $result['pagination']['has_prev']);
        self::assertSame([['ss_id' => 11, 'ss_send' => 0]], $result['items']);
    }

    public function testUpdateStockSmsRejectsWhenMissingRecord(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')->willReturnCallback(function (string $sql, array $params = []) : Result {
            if (str_contains($sql, 'information_schema.TABLES')) {
                return $this->createResult(['cnt' => 1]);
            }

            return $this->createResult(false);
        });

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('재입고 알림이 없습니다.');

        $service->updateStockSms(10, ['ss_send' => 1]);
    }

    public function testUpdateStockSmsRejectsWhenPayloadIsEmpty(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')->willReturnCallback(function (string $sql, array $params = []) : Result {
            if (str_contains($sql, 'information_schema.TABLES')) {
                return $this->createResult(['cnt' => 1]);
            }

            if (str_contains($sql, 'SELECT ss_id, it_id, ss_hp, ss_send, ss_send_time, ss_datetime, ss_ip')) {
                return $this->createResult(['ss_id' => 10]);
            }

            return $this->createResult(false);
        });

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('수정할 필드가 없습니다.');

        $service->updateStockSms(10, []);
    }

    public function testUpdateStockSmsRejectsWhenNoUpdatableField(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')->willReturnCallback(function (string $sql, array $params = []) : Result {
            if (str_contains($sql, 'information_schema.TABLES')) {
                return $this->createResult(['cnt' => 1]);
            }

            if (str_contains($sql, 'SELECT ss_id, it_id, ss_hp, ss_send, ss_send_time, ss_datetime, ss_ip')) {
                return $this->createResult(['ss_id' => 10]);
            }

            if (str_contains($sql, 'information_schema.COLUMNS')) {
                return $this->createResult(false, $this->tableColumns('g5_shop_item_stocksms'));
            }

            return $this->createResult(false);
        });
        $qb->expects($this->once())
            ->method('executeStatement')
            ->with(
                self::stringContains('UPDATE g5_shop_item_stocksms SET'),
                self::callback(function (array $params): bool {
                    return ($params['ss_id'] ?? null) === '10'
                        && ($params['u_ss_send'] ?? null) === 0;
                })
            )
            ->willReturn(0);

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('수정할 필드가 없습니다.');

        $service->updateStockSms(10, ['ss_send' => 0]);
    }

    public function testSendStockSmsRejectsWhenMissingRecord(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')->willReturnCallback(function (string $sql, array $params = []) : Result {
            if (str_contains($sql, 'information_schema.TABLES')) {
                return $this->createResult(['cnt' => 1]);
            }

            return $this->createResult(false);
        });

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('재입고 알림이 없습니다.');

        $service->sendStockSms(10);
    }

    public function testSendStockSmsRejectsWhenUpdateFailed(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')->willReturnCallback(function (string $sql, array $params = []) : Result {
            if (str_contains($sql, 'information_schema.TABLES')) {
                return $this->createResult(['cnt' => 1]);
            }

            if (str_contains($sql, 'SELECT ss_id, it_id, ss_hp, ss_send, ss_send_time, ss_datetime, ss_ip')) {
                return $this->createResult(['ss_id' => 10]);
            }

            return $this->createResult(false);
        });
        $qb->expects($this->once())
            ->method('executeStatement')
            ->with(
                self::stringContains('UPDATE g5_shop_item_stocksms SET ss_send = 1, ss_send_time = NOW() WHERE ss_id = :ss_id'),
                self::callback(function (array $params): bool {
                    return ($params['ss_id'] ?? null) === '10';
                })
            )
            ->willReturn(0);

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('재입고 알림 상태를 변경할 수 없습니다.');

        $service->sendStockSms(10);
    }

    public function testDeleteStockSmsRejectsWhenMissingRecord(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('executeQuery')->willReturnCallback(function (string $sql, array $params = []) : Result {
            if (str_contains($sql, 'information_schema.TABLES')) {
                return $this->createResult(['cnt' => 1]);
            }

            return $this->createResult(false);
        });
        $qb->expects($this->once())
            ->method('executeStatement')
            ->with(
                self::stringContains('DELETE FROM g5_shop_item_stocksms'),
                self::callback(function (array $params): bool {
                    return ($params['ss_id'] ?? null) === '10';
                })
            )
            ->willReturn(0);

        $service = $this->createService($qb);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('재입고 알림이 없습니다.');

        $service->deleteStockSms(10);
    }

    private function createService(QueryBuilder $qb): AdminShopCatalogService
    {
        return new AdminShopCatalogService($this->createRepository($qb));
    }

    private function createRepository(QueryBuilder $qb): AdminShopCatalogRepository
    {
        return new AdminShopCatalogRepository($qb, new TableRegistry('g5_'));
    }

    /**
     * @return list<array<string, string>>
     */
    private function tableColumns(string $table): array
    {
        return match ($table) {
            'g5_shop_item' => [
                ['COLUMN_NAME' => 'it_id'],
                ['COLUMN_NAME' => 'it_name'],
            ],
            'g5_shop_item_option' => [
                ['COLUMN_NAME' => 'io_no'],
                ['COLUMN_NAME' => 'io_id'],
                ['COLUMN_NAME' => 'io_type'],
                ['COLUMN_NAME' => 'it_id'],
                ['COLUMN_NAME' => 'io_price'],
                ['COLUMN_NAME' => 'io_stock_qty'],
                ['COLUMN_NAME' => 'io_noti_qty'],
                ['COLUMN_NAME' => 'io_use'],
            ],
            'g5_shop_item_stocksms' => [
                ['COLUMN_NAME' => 'ss_id'],
                ['COLUMN_NAME' => 'it_id'],
                ['COLUMN_NAME' => 'ss_hp'],
                ['COLUMN_NAME' => 'ss_send'],
                ['COLUMN_NAME' => 'ss_send_time'],
                ['COLUMN_NAME' => 'ss_datetime'],
                ['COLUMN_NAME' => 'ss_ip'],
            ],
            default => [],
        };
    }

    private function createResult(array|false $assoc, array $all = []): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);
        $result->method('fetchAllAssociative')->willReturn($all);

        return $result;
    }
}
