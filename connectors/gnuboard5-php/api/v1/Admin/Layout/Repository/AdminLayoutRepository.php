<?php

/**
 * AdminLayoutRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Layout\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Layout\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class AdminLayoutRepository extends AdminBaseRepository
{
    private ?AdminLayoutQueryRepository $resolvedQueryRepository = null;
    private ?AdminLayoutMutationRepository $resolvedMutationRepository = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?AdminLayoutQueryRepository $queryRepository = null,
        ?AdminLayoutMutationRepository $mutationRepository = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedQueryRepository = $queryRepository;
        $this->resolvedMutationRepository = $mutationRepository;
    }

    /**
     * @return array{items: array<int, array<string, mixed>>, total: int}
     */
    public function list(int $page, int $perPage): array
    {
        return $this->queryRepository()->list($page, $perPage);
    }

    public function detail(string $pageId): ?array
    {
        return $this->queryRepository()->detail($pageId);
    }

    public function saveLayout(string $pageId, string $title, array $widgets, string $datetime): array
    {
        return $this->mutationRepository()->saveLayout($pageId, $title, $widgets, $datetime);
    }

    public function addWidget(string $pageId, array $widget, string $datetime): array
    {
        return $this->mutationRepository()->addWidget($pageId, $widget, $datetime);
    }

    public function updateWidget(string $pageId, string $widgetId, array $payload, string $datetime): array
    {
        return $this->mutationRepository()->updateWidget($pageId, $widgetId, $payload, $datetime);
    }

    public function deleteWidget(string $pageId, string $widgetId, string $datetime): array
    {
        return $this->mutationRepository()->deleteWidget($pageId, $widgetId, $datetime);
    }

    /**
     * @param array<int, string> $widgetIds
     */
    public function reorder(string $pageId, array $widgetIds, string $datetime): array
    {
        return $this->mutationRepository()->reorder($pageId, $widgetIds, $datetime);
    }

    private function queryRepository(): AdminLayoutQueryRepository
    {
        if ($this->resolvedQueryRepository instanceof AdminLayoutQueryRepository) {
            return $this->resolvedQueryRepository;
        }

        $this->resolvedQueryRepository = new AdminLayoutQueryRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedQueryRepository;
    }

    private function mutationRepository(): AdminLayoutMutationRepository
    {
        if ($this->resolvedMutationRepository instanceof AdminLayoutMutationRepository) {
            return $this->resolvedMutationRepository;
        }

        $this->resolvedMutationRepository = new AdminLayoutMutationRepository(
            $this->queryBuilder(),
            $this->tables(),
            $this->queryRepository()
        );

        return $this->resolvedMutationRepository;
    }
}
