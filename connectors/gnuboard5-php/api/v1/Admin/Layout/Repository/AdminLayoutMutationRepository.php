<?php

declare(strict_types=1);

namespace Api\Admin\Layout\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Throwable;

final class AdminLayoutMutationRepository extends AdminLayoutRepositoryBase
{
    private ?AdminLayoutQueryRepository $resolvedQueryRepository = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?AdminLayoutQueryRepository $queryRepository = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedQueryRepository = $queryRepository;
    }

    public function saveLayout(string $pageId, string $title, array $widgets, string $datetime): array
    {
        $schema = json_encode(['widgets' => array_values($widgets)], JSON_UNESCAPED_UNICODE);
        if (!is_string($schema)) {
            $schema = '{"widgets":[]}';
        }

        try {
            $this->executeStatement(
                "INSERT INTO {$this->layoutTable()}
                    (sl_page_id, sl_title, sl_schema, sl_active, sl_datetime, sl_updated)
                 VALUES
                    (:sl_page_id, :sl_title, :sl_schema, 1, :sl_datetime, :sl_updated)
                 ON DUPLICATE KEY UPDATE
                    sl_title = VALUES(sl_title),
                    sl_schema = VALUES(sl_schema),
                    sl_active = 1,
                    sl_updated = VALUES(sl_updated)",
                [
                    'sl_page_id' => $pageId,
                    'sl_title' => $title,
                    'sl_schema' => $schema,
                    'sl_datetime' => $datetime,
                    'sl_updated' => $datetime,
                ]
            );
        } catch (Throwable $exception) {
            if ($this->isMissingTable($exception)) {
                return [];
            }

            throw $exception;
        }

        return $this->queryRepository()->detail($pageId) ?? [];
    }

    public function addWidget(string $pageId, array $widget, string $datetime): array
    {
        $layout = $this->queryRepository()->detail($pageId);
        $title = (string)($layout['sl_title'] ?? $pageId);
        $widgets = $this->extractWidgets($layout);
        $widgets[] = $widget;

        return $this->saveLayout($pageId, $title, $widgets, $datetime);
    }

    public function updateWidget(string $pageId, string $widgetId, array $payload, string $datetime): array
    {
        $layout = $this->queryRepository()->detail($pageId);
        if ($layout === null) {
            return [];
        }

        $title = (string)($layout['sl_title'] ?? $pageId);
        $widgets = $this->extractWidgets($layout);
        $found = false;
        foreach ($widgets as $index => $widget) {
            if ((string)($widget['widget_id'] ?? '') !== $widgetId) {
                continue;
            }

            $next = $widget;
            foreach (['type', 'title', 'order'] as $field) {
                if (array_key_exists($field, $payload)) {
                    $next[$field] = $payload[$field];
                }
            }
            if (array_key_exists('config', $payload) && is_array($payload['config'])) {
                $next['config'] = $payload['config'];
            }
            if (array_key_exists('style', $payload) && is_array($payload['style'])) {
                $next['style'] = $payload['style'];
            }

            $widgets[$index] = $next;
            $found = true;
            break;
        }

        if (!$found) {
            return [];
        }

        return $this->saveLayout($pageId, $title, $widgets, $datetime);
    }

    public function deleteWidget(string $pageId, string $widgetId, string $datetime): array
    {
        $layout = $this->queryRepository()->detail($pageId);
        if ($layout === null) {
            return [];
        }

        $title = (string)($layout['sl_title'] ?? $pageId);
        $widgets = array_values(array_filter(
            $this->extractWidgets($layout),
            static fn (array $widget): bool => (string)($widget['widget_id'] ?? '') !== $widgetId
        ));

        return $this->saveLayout($pageId, $title, $widgets, $datetime);
    }

    /**
     * @param array<int, string> $widgetIds
     */
    public function reorder(string $pageId, array $widgetIds, string $datetime): array
    {
        $layout = $this->queryRepository()->detail($pageId);
        if ($layout === null) {
            return [];
        }

        $title = (string)($layout['sl_title'] ?? $pageId);
        $widgets = $this->extractWidgets($layout);
        $orderMap = [];
        $position = 1;
        foreach ($widgetIds as $widgetId) {
            $orderMap[$widgetId] = $position;
            $position++;
        }

        foreach ($widgets as $index => $widget) {
            $currentWidgetId = (string)($widget['widget_id'] ?? '');
            if ($currentWidgetId !== '' && isset($orderMap[$currentWidgetId])) {
                $widget['order'] = $orderMap[$currentWidgetId];
            }
            $widgets[$index] = $widget;
        }

        usort(
            $widgets,
            static fn (array $a, array $b): int => (int)($a['order'] ?? 9999) <=> (int)($b['order'] ?? 9999)
        );

        return $this->saveLayout($pageId, $title, $widgets, $datetime);
    }

    private function queryRepository(): AdminLayoutQueryRepository
    {
        if ($this->resolvedQueryRepository instanceof AdminLayoutQueryRepository) {
            return $this->resolvedQueryRepository;
        }

        $this->resolvedQueryRepository = new AdminLayoutQueryRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedQueryRepository;
    }
}
