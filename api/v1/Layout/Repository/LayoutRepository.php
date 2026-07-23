<?php

/**
 * LayoutRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Layout\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Layout\Repository;

use Api\Support\Repository\BaseRepository;
use Throwable;

final class LayoutRepository extends BaseRepository
{
    public function findByPage(string $pageId): ?array
    {
        $table = $this->tables()->get('sdui_layout');
        try {
            $row = $this->fetchAssociative(
                "SELECT sl_id, sl_page_id, sl_title, sl_schema, sl_active, sl_datetime, sl_updated
                 FROM {$table}
                 WHERE sl_page_id = :sl_page_id AND sl_active = 1
                 LIMIT 1",
                ['sl_page_id' => $pageId]
            );
        } catch (Throwable $exception) {
            if ($this->isMissingTable($exception)) {
                return null;
            }

            throw $exception;
        }

        return is_array($row) ? $row : null;
    }

    public function findWidget(string $pageId, string $widgetId): ?array
    {
        $layout = $this->findByPage($pageId);
        if ($layout === null) {
            return null;
        }

        $schema = $this->decodeSchema((string)($layout['sl_schema'] ?? '{}'));
        $widgets = $schema['widgets'] ?? [];
        if (!is_array($widgets)) {
            return null;
        }

        foreach ($widgets as $widget) {
            if (!is_array($widget)) {
                continue;
            }

            if ((string)($widget['widget_id'] ?? '') === $widgetId) {
                return $widget;
            }
        }

        return null;
    }

    /**
     * @return array{page_id: string, title: string, updated_at: string, widgets: array<int, array<string, mixed>>}|null
     */
    public function layoutPayload(string $pageId): ?array
    {
        $layout = $this->findByPage($pageId);
        if ($layout === null) {
            return null;
        }

        $schema = $this->decodeSchema((string)($layout['sl_schema'] ?? '{}'));
        $widgets = $schema['widgets'] ?? [];
        if (!is_array($widgets)) {
            $widgets = [];
        }

        return [
            'page_id' => (string)($layout['sl_page_id'] ?? $pageId),
            'title' => (string)($layout['sl_title'] ?? ''),
            'updated_at' => (string)($layout['sl_updated'] ?? ''),
            'widgets' => array_values(array_filter($widgets, static fn (mixed $widget): bool => is_array($widget))),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeSchema(string $raw): array
    {
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function isMissingTable(Throwable $exception): bool
    {
        return str_contains($exception->getMessage(), 'Base table or view not found')
            || str_contains($exception->getMessage(), '1146');
    }
}
