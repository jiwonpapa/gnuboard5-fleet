<?php

/**
 * AdminLayoutPresenter API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Layout\Service\Support
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Layout\Service\Support;

final class AdminLayoutPresenter
{
    /**
     * @param array<string, mixed> $layout
     * @return array{sl_id:int, sl_page_id:string, sl_title:string, sl_active:int, sl_datetime:string, sl_updated:string}
     */
    public static function summary(array $layout): array
    {
        return [
            'sl_id' => (int)($layout['sl_id'] ?? 0),
            'sl_page_id' => (string)($layout['sl_page_id'] ?? ''),
            'sl_title' => (string)($layout['sl_title'] ?? ''),
            'sl_active' => (int)($layout['sl_active'] ?? 0),
            'sl_datetime' => (string)($layout['sl_datetime'] ?? ''),
            'sl_updated' => (string)($layout['sl_updated'] ?? ''),
        ];
    }

    /**
     * @param array<string, mixed> $layout
     * @return array{sl_id:int, sl_page_id:string, sl_title:string, sl_schema:string, sl_active:int, sl_datetime:string, sl_updated:string}
     */
    public static function detail(array $layout): array
    {
        return [
            ...self::summary($layout),
            'sl_schema' => (string)($layout['sl_schema'] ?? '{"widgets":[]}'),
        ];
    }
}
