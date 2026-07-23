<?php

/**
 * 관리자 레이아웃 응답 정규화 회귀를 검증합니다.
 *
 * @package  Tests\Admin\Layout
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Tests\Admin\Layout;

use Api\Admin\Layout\Service\Support\AdminLayoutPresenter;
use PHPUnit\Framework\TestCase;

final class AdminLayoutPresenterTest extends TestCase
{
    public function testSummaryNormalizesDatabaseScalarTypes(): void
    {
        self::assertSame([
            'sl_id' => 7,
            'sl_page_id' => 'dashboard',
            'sl_title' => '대시보드',
            'sl_active' => 1,
            'sl_datetime' => '2026-07-15 10:00:00',
            'sl_updated' => '2026-07-15 11:00:00',
        ], AdminLayoutPresenter::summary([
            'sl_id' => '7',
            'sl_page_id' => 'dashboard',
            'sl_title' => '대시보드',
            'sl_active' => '1',
            'sl_datetime' => '2026-07-15 10:00:00',
            'sl_updated' => '2026-07-15 11:00:00',
        ]));
    }

    public function testDetailPreservesStoredSchemaJsonString(): void
    {
        $detail = AdminLayoutPresenter::detail([
            'sl_id' => 3,
            'sl_page_id' => 'home',
            'sl_title' => '홈',
            'sl_schema' => '{"widgets":[{"widget_id":"hero"}]}',
            'sl_active' => 0,
            'sl_datetime' => '2026-07-15 10:00:00',
            'sl_updated' => '2026-07-15 11:00:00',
        ]);

        self::assertSame('{"widgets":[{"widget_id":"hero"}]}', $detail['sl_schema']);
        self::assertSame(0, $detail['sl_active']);
    }
}
