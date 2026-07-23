<?php

declare(strict_types=1);

namespace Api\Admin\Layout\Service\Support;

use Api\Support\Exception\ApiException;

final class AdminLayoutInputNormalizer
{
    private const WIDGET_TYPES = [
        'latest_posts',
        'notice_banner',
        'popular_posts',
        'category_grid',
        'search_bar',
        'image_carousel',
        'ad_banner',
        'spacer',
        'html_block',
        'quick_menu',
    ];

    /**
     * @param array<string, mixed> $query
     * @return array{page:int, per_page:int}
     */
    public function normalizeListQuery(array $query): array
    {
        return [
            'page' => max(1, (int)($query['page'] ?? 1)),
            'per_page' => max(1, min(100, (int)($query['per_page'] ?? 20))),
        ];
    }

    public function normalizePageId(string $pageId): string
    {
        $value = trim($pageId);
        if ($value === '' || preg_match('/^[a-zA-Z0-9_\-]{1,50}$/', $value) !== 1) {
            throw ApiException::badRequest('page_id 형식이 올바르지 않습니다.');
        }

        return $value;
    }

    public function normalizeWidgetId(string $widgetId): string
    {
        $value = trim($widgetId);
        if ($value === '' || preg_match('/^[a-zA-Z0-9_\-]{1,80}$/', $value) !== 1) {
            throw ApiException::badRequest('widget_id 형식이 올바르지 않습니다.');
        }

        return $value;
    }

    /**
     * @param array<string, mixed> $payload
     * @return list<array<string, mixed>>
     */
    public function normalizeWidgetsPayload(array $payload): array
    {
        $widgets = $payload['widgets'] ?? null;
        if (!is_array($widgets)) {
            throw ApiException::badRequest('widgets 배열이 필요합니다.');
        }

        $normalized = [];
        foreach ($widgets as $widget) {
            if (!is_array($widget)) {
                continue;
            }

            $normalized[] = $this->normalizeWidget($widget, false);
        }

        return $normalized;
    }

    /**
     * @param array<string, mixed> $widget
     * @return array<string, mixed>
     */
    public function normalizeWidget(array $widget, bool $requireId): array
    {
        $type = trim((string)($widget['type'] ?? ''));
        if (!in_array($type, self::WIDGET_TYPES, true)) {
            throw ApiException::badRequest('지원하지 않는 widget type 입니다.');
        }

        $widgetId = trim((string)($widget['widget_id'] ?? ''));
        if ($widgetId === '' && $requireId) {
            $widgetId = bin2hex(random_bytes(8));
        }
        if ($widgetId === '' || preg_match('/^[a-zA-Z0-9_\-]{1,80}$/', $widgetId) !== 1) {
            throw ApiException::badRequest('widget_id 형식이 올바르지 않습니다.');
        }

        return [
            'widget_id' => $widgetId,
            'type' => $type,
            'title' => trim((string)($widget['title'] ?? '')),
            'order' => max(1, (int)($widget['order'] ?? 1)),
            'config' => is_array($widget['config'] ?? null) ? $widget['config'] : [],
            'style' => is_array($widget['style'] ?? null) ? $widget['style'] : [],
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function normalizeWidgetPatch(array $payload): array
    {
        $next = [];
        if (array_key_exists('type', $payload)) {
            $next['type'] = trim((string)$payload['type']);
        }
        if (array_key_exists('title', $payload)) {
            $next['title'] = trim((string)$payload['title']);
        }
        if (array_key_exists('order', $payload)) {
            $next['order'] = max(1, (int)$payload['order']);
        }
        if (array_key_exists('config', $payload)) {
            $next['config'] = is_array($payload['config']) ? $payload['config'] : [];
        }
        if (array_key_exists('style', $payload)) {
            $next['style'] = is_array($payload['style']) ? $payload['style'] : [];
        }
        if (isset($next['type']) && !in_array((string)$next['type'], self::WIDGET_TYPES, true)) {
            throw ApiException::badRequest('지원하지 않는 widget type 입니다.');
        }

        return $next;
    }

    /**
     * @param array<string, mixed> $payload
     * @return list<string>
     */
    public function normalizeWidgetOrderIds(array $payload): array
    {
        $widgetIds = $payload['widget_ids'] ?? null;
        if (!is_array($widgetIds) || $widgetIds === []) {
            throw ApiException::badRequest('widget_ids 배열이 필요합니다.');
        }

        $normalizedIds = [];
        foreach ($widgetIds as $widgetId) {
            $normalizedIds[] = $this->normalizeWidgetId((string)$widgetId);
        }

        return $normalizedIds;
    }
}
