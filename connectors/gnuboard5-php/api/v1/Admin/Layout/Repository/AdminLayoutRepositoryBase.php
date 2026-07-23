<?php

declare(strict_types=1);

namespace Api\Admin\Layout\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;
use Throwable;

abstract class AdminLayoutRepositoryBase extends AdminBaseRepository
{
    protected function layoutTable(): string
    {
        return $this->tables()->get('sdui_layout');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function extractWidgets(?array $layout): array
    {
        if (!is_array($layout)) {
            return [];
        }

        $schema = json_decode((string)($layout['sl_schema'] ?? '{}'), true);
        if (!is_array($schema)) {
            return [];
        }

        $widgets = $schema['widgets'] ?? [];
        if (!is_array($widgets)) {
            return [];
        }

        return array_values(array_filter($widgets, static fn (mixed $widget): bool => is_array($widget)));
    }

    protected function isMissingTable(Throwable $exception): bool
    {
        return str_contains($exception->getMessage(), 'Base table or view not found')
            || str_contains($exception->getMessage(), '1146');
    }
}
