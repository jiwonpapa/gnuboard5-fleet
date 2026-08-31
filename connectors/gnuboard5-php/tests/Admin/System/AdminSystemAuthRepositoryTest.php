<?php

declare(strict_types=1);

namespace Tests\Admin\System;

use Api\Admin\System\Repository\AdminSystemAuthRepository;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class AdminSystemAuthRepositoryTest extends TestCase
{
    public function testSaveEncodesCompactPermissionsForStockG5SetColumn(): void
    {
        $queries = $this->createMock(QueryBuilder::class);
        $queries->expects(self::once())->method('executeStatement')->with(
            self::callback(static fn (string $sql): bool => str_contains($sql, 'INSERT INTO g5_auth')),
            ['mb_id' => 'fleetcert', 'au_menu' => '200100', 'au_auth' => 'd,r,w', 'u_au_auth' => 'd,r,w']
        )->willReturn(1);
        (new AdminSystemAuthRepository($queries, new TableRegistry('g5_')))
            ->upsertAuth('fleetcert', '200100', 'drw');
    }

    public function testListDecodesSetWithoutChangingPublicCompactContract(): void
    {
        $queries = $this->createMock(QueryBuilder::class);
        $queries->expects(self::exactly(2))->method('executeQuery')->willReturnCallback(
            function (string $sql, array $params): Result {
                self::assertSame(['mb_id' => 'fleetcert'], $params);
                $result = $this->createMock(Result::class);
                if (str_contains($sql, 'COUNT(*)')) {
                    $result->method('fetchAssociative')->willReturn(['cnt' => 1]);
                } else {
                    $result->method('fetchAllAssociative')->willReturn([
                        ['mb_id' => 'fleetcert', 'au_menu' => '200100', 'au_auth' => 'r,w,d'],
                    ]);
                }
                return $result;
            }
        );
        $rows = (new AdminSystemAuthRepository($queries, new TableRegistry('g5_')))
            ->listAuth(1, 20, 'fleetcert');
        self::assertSame(1, $rows['total']);
        self::assertSame('rwd', $rows['items'][0]['au_auth']);
    }
}
