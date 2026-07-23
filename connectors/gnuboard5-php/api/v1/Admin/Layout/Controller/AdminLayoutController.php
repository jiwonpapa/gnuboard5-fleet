<?php

/**
 * AdminLayoutController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Layout\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Layout\Controller;

use Api\Admin\Layout\Service\AdminLayoutService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminLayoutController
{
    public function __construct(private readonly AdminLayoutService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $result = $this->service->list($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function detail(Request $request, Response $response, array $args): Response
    {
        $pageId = (string)($args['page_id'] ?? '');
        $layout = $this->service->detail($pageId);

        return ApiResponse::envelope($response, $layout);
    }

    public function save(Request $request, Response $response, array $args): Response
    {
        $pageId = (string)($args['page_id'] ?? '');
        $payload = ApiResponse::parseJsonBody($request);
        $saved = $this->service->save($pageId, $payload);

        return ApiResponse::envelope($response, $saved);
    }

    public function addWidget(Request $request, Response $response, array $args): Response
    {
        $pageId = trim((string)($args['page_id'] ?? ''));
        $payload = ApiResponse::parseJsonBody($request);
        $widgetId = trim((string)($payload['widget_id'] ?? ''));
        if ($widgetId === '') {
            $widgetId = bin2hex(random_bytes(8));
            $payload['widget_id'] = $widgetId;
        }
        $saved = $this->service->addWidget($pageId, $payload);

        $location = '/api/v1/admin/layouts/' . rawurlencode($pageId)
            . '/widgets/' . rawurlencode($widgetId);

        return ApiResponse::envelope($response, $saved, null, [], 201)
            ->withHeader('Location', $location);
    }

    public function updateWidget(Request $request, Response $response, array $args): Response
    {
        $pageId = (string)($args['page_id'] ?? '');
        $widgetId = (string)($args['widget_id'] ?? '');
        $payload = ApiResponse::parseJsonBody($request);
        $updated = $this->service->updateWidget($pageId, $widgetId, $payload);

        return ApiResponse::envelope($response, $updated);
    }

    public function deleteWidget(Request $request, Response $response, array $args): Response
    {
        $pageId = (string)($args['page_id'] ?? '');
        $widgetId = (string)($args['widget_id'] ?? '');
        $updated = $this->service->deleteWidget($pageId, $widgetId);

        return ApiResponse::envelope($response, $updated);
    }

    public function reorder(Request $request, Response $response, array $args): Response
    {
        $pageId = (string)($args['page_id'] ?? '');
        $payload = ApiResponse::parseJsonBody($request);
        $updated = $this->service->reorder($pageId, $payload);

        return ApiResponse::envelope($response, $updated);
    }
}
