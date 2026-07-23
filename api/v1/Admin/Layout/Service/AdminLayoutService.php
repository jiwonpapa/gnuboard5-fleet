<?php

/**
 * AdminLayoutService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Layout\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Layout\Service;

use Api\Admin\Layout\Repository\AdminLayoutRepository;
use Api\Admin\Layout\Service\Support\AdminLayoutInputNormalizer;
use Api\Admin\Layout\Service\Support\AdminLayoutPresenter;
use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;

final class AdminLayoutService
{
    public function __construct(
        private readonly AdminLayoutRepository $repository,
        private readonly AdminLayoutInputNormalizer $input = new AdminLayoutInputNormalizer()
    ) {
    }

    /**
     * @return array{items: array<int, array<string, mixed>>, pagination: array<string, mixed>}
     */
    public function list(array $query): array
    {
        $pagination = $this->input->normalizeListQuery($query);
        $page = $pagination['page'];
        $perPage = $pagination['per_page'];

        $result = $this->repository->list($page, $perPage);
        $total = (int)($result['total'] ?? 0);
        $lastPage = (int)ceil($total / $perPage);

        return [
            'items' => array_map(
                static fn (array $layout): array => AdminLayoutPresenter::summary($layout),
                $result['items']
            ),
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => $lastPage,
                'has_next' => $page < $lastPage,
                'has_prev' => $page > 1,
            ],
        ];
    }

    public function detail(string $pageId): array
    {
        $normalizedPageId = $this->input->normalizePageId($pageId);
        $layout = $this->repository->detail($normalizedPageId);
        if ($layout === null) {
            throw ApiException::notFound('레이아웃을 찾을 수 없습니다.');
        }

        return AdminLayoutPresenter::detail($layout);
    }

    public function save(string $pageId, array $payload): array
    {
        $normalizedPageId = $this->input->normalizePageId($pageId);
        $title = trim((string)($payload['title'] ?? $normalizedPageId));
        $normalizedWidgets = $this->input->normalizeWidgetsPayload($payload);

        return AdminLayoutPresenter::detail(
            $this->repository->saveLayout($normalizedPageId, $title, $normalizedWidgets, G5DateTime::now())
        );
    }

    public function addWidget(string $pageId, array $payload): array
    {
        $normalizedPageId = $this->input->normalizePageId($pageId);
        $widget = $this->input->normalizeWidget($payload, true);

        return AdminLayoutPresenter::detail(
            $this->repository->addWidget($normalizedPageId, $widget, G5DateTime::now())
        );
    }

    public function updateWidget(string $pageId, string $widgetId, array $payload): array
    {
        $normalizedPageId = $this->input->normalizePageId($pageId);
        $normalizedWidgetId = $this->input->normalizeWidgetId($widgetId);
        $next = $this->input->normalizeWidgetPatch($payload);

        $updated = $this->repository->updateWidget($normalizedPageId, $normalizedWidgetId, $next, G5DateTime::now());
        if ($updated === []) {
            throw ApiException::notFound('레이아웃 또는 위젯을 찾을 수 없습니다.');
        }

        return AdminLayoutPresenter::detail($updated);
    }

    public function deleteWidget(string $pageId, string $widgetId): array
    {
        $normalizedPageId = $this->input->normalizePageId($pageId);
        $normalizedWidgetId = $this->input->normalizeWidgetId($widgetId);
        $updated = $this->repository->deleteWidget($normalizedPageId, $normalizedWidgetId, G5DateTime::now());
        if ($updated === []) {
            throw ApiException::notFound('레이아웃 또는 위젯을 찾을 수 없습니다.');
        }

        return AdminLayoutPresenter::detail($updated);
    }

    public function reorder(string $pageId, array $payload): array
    {
        $normalizedPageId = $this->input->normalizePageId($pageId);
        $normalizedIds = $this->input->normalizeWidgetOrderIds($payload);

        $updated = $this->repository->reorder($normalizedPageId, $normalizedIds, G5DateTime::now());
        if ($updated === []) {
            throw ApiException::notFound('레이아웃을 찾을 수 없습니다.');
        }

        return AdminLayoutPresenter::detail($updated);
    }
}
