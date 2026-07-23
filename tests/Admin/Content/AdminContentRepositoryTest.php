<?php

declare(strict_types=1);

namespace Tests\Admin\Content;

use Api\Admin\Content\Repository\AdminContentRepository;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use PHPUnit\Framework\TestCase;

final class AdminContentRepositoryTest extends TestCase
{
    public function testCreateSupportsLegacyParityFields(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects(self::once())
            ->method('executeStatement')
            ->with(
                self::callback(static function (string $sql): bool {
                    return str_contains($sql, 'co_include_head')
                        && str_contains($sql, 'co_include_tail')
                        && str_contains($sql, 'co_tag_filter_use')
                        && str_contains($sql, 'co_skin')
                        && str_contains($sql, 'co_mobile_skin');
                }),
                self::callback(static function (array $params): bool {
                    return ($params['co_id'] ?? null) === 'about_us'
                        && ($params['co_include_head'] ?? null) === './head.php'
                        && ($params['co_include_tail'] ?? null) === './tail.php'
                        && ($params['co_tag_filter_use'] ?? null) === 1
                        && ($params['co_skin'] ?? null) === 'basic'
                        && ($params['co_mobile_skin'] ?? null) === 'mobile';
                })
            )
            ->willReturn(1);

        $repository = new AdminContentRepository($qb, new TableRegistry('g5_'));
        $repository->create([
            'co_id' => 'about_us',
            'co_subject' => '회사 소개',
            'co_html' => 1,
            'co_content' => '<p>hello</p>',
            'co_include_head' => './head.php',
            'co_include_tail' => './tail.php',
            'co_tag_filter_use' => 1,
            'co_skin' => 'basic',
            'co_mobile_skin' => 'mobile',
        ]);

        self::assertTrue(true);
    }
}
