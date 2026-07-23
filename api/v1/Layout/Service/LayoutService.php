<?php

/**
 * LayoutService API module.
 *
 * @package  Gnuboard5\Api\v1\Layout\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Layout\Service;

use Api\Layout\Repository\LayoutRepository;
use Api\Support\Exception\ApiException;

final class LayoutService
{
    public function __construct(private readonly LayoutRepository $repository)
    {
    }

    public function getLayout(string $pageId): array
    {
        $normalizedPageId = $this->normalizePageId($pageId);
        $layout = $this->repository->layoutPayload($normalizedPageId);
        if ($layout === null) {
            return [
                'page_id' => $normalizedPageId,
                'title' => '',
                'updated_at' => '',
                'widgets' => [],
            ];
        }

        return $layout;
    }

    public function getWidgetData(string $pageId, string $widgetId): array
    {
        $normalizedPageId = $this->normalizePageId($pageId);
        $normalizedWidgetId = $this->normalizeWidgetId($widgetId);
        $widget = $this->repository->findWidget($normalizedPageId, $normalizedWidgetId);
        if ($widget === null) {
            throw ApiException::notFound('위젯 정보를 찾을 수 없습니다.');
        }

        return [
            'page_id' => $normalizedPageId,
            'widget_id' => $normalizedWidgetId,
            'type' => (string)($widget['type'] ?? ''),
            'config' => is_array($widget['config'] ?? null) ? $widget['config'] : [],
            'style' => is_array($widget['style'] ?? null) ? $widget['style'] : [],
            'data' => $widget['data'] ?? [],
        ];
    }

    private function normalizePageId(string $pageId): string
    {
        $value = trim($pageId);
        if ($value === '' || preg_match('/^[a-zA-Z0-9_\-]{1,50}$/', $value) !== 1) {
            throw ApiException::badRequest('page_id 형식이 올바르지 않습니다.');
        }

        return $value;
    }

    private function normalizeWidgetId(string $widgetId): string
    {
        $value = trim($widgetId);
        if ($value === '' || preg_match('/^[a-zA-Z0-9_\-]{1,80}$/', $value) !== 1) {
            throw ApiException::badRequest('widget_id 형식이 올바르지 않습니다.');
        }

        return $value;
    }
}
