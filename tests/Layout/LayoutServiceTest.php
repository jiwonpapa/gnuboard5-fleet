<?php

declare(strict_types=1);

namespace Tests\Layout;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Layout\Repository\LayoutRepository;
use Api\Layout\Service\LayoutService;
use Api\Support\Exception\ApiException;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;

final class LayoutServiceTest extends TestCase
{
    public function testGetLayoutReturnsEmptyPayloadWhenLayoutMissing(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult(false));

        $service = new LayoutService(new LayoutRepository($qb, new TableRegistry('g5_')));
        $layout = $service->getLayout('home');

        $this->assertSame('home', $layout['page_id']);
        $this->assertSame('', $layout['title']);
        $this->assertSame([], $layout['widgets']);
    }

    public function testGetWidgetDataRejectsInvalidPageId(): void
    {
        $service = new LayoutService(new LayoutRepository($this->createMock(QueryBuilder::class), new TableRegistry('g5_')));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('page_id 형식이 올바르지 않습니다.');

        $service->getLayout('bad page id');
    }

    public function testGetWidgetDataReturnsNormalizedPayload(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult([
                'sl_id' => 1,
                'sl_page_id' => 'home',
                'sl_title' => '홈',
                'sl_schema' => json_encode([
                    'widgets' => [
                        [
                            'widget_id' => 'hero-banner',
                            'type' => 'hero',
                            'config' => ['headline' => '환영합니다'],
                            'style' => ['theme' => 'light'],
                            'data' => ['items' => [1, 2]],
                        ],
                    ],
                ], JSON_UNESCAPED_UNICODE),
                'sl_active' => 1,
                'sl_datetime' => '2026-03-06 12:00:00',
                'sl_updated' => '2026-03-06 12:30:00',
            ]));

        $service = new LayoutService(new LayoutRepository($qb, new TableRegistry('g5_')));
        $widget = $service->getWidgetData('home', 'hero-banner');

        $this->assertSame('home', $widget['page_id']);
        $this->assertSame('hero-banner', $widget['widget_id']);
        $this->assertSame('hero', $widget['type']);
        $this->assertSame(['headline' => '환영합니다'], $widget['config']);
    }

    public function testGetWidgetDataThrowsWhenWidgetMissing(): void
    {
        $qb = $this->createMock(QueryBuilder::class);
        $qb->expects($this->once())
            ->method('executeQuery')
            ->willReturn($this->createResult([
                'sl_page_id' => 'home',
                'sl_title' => '홈',
                'sl_schema' => json_encode(['widgets' => []], JSON_UNESCAPED_UNICODE),
                'sl_updated' => '2026-03-06 12:30:00',
            ]));

        $service = new LayoutService(new LayoutRepository($qb, new TableRegistry('g5_')));

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('위젯 정보를 찾을 수 없습니다.');

        $service->getWidgetData('home', 'hero-banner');
    }

    private function createResult(array|false $assoc): Result
    {
        $result = $this->createMock(Result::class);
        $result->method('fetchAssociative')->willReturn($assoc);

        return $result;
    }
}
