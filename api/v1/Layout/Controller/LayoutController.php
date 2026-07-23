<?php

/**
 * LayoutController API module.
 *
 * @package  Gnuboard5\Api\v1\Layout\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Layout\Controller;

use Api\Layout\Service\LayoutService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class LayoutController
{
    public function __construct(private readonly LayoutService $service)
    {
    }

    public function detail(Request $request, Response $response, array $args): Response
    {
        $pageId = (string)($args['page_id'] ?? '');
        $layout = $this->service->getLayout($pageId);

        return ApiResponse::envelope($response, $layout);
    }

    public function widgetData(Request $request, Response $response, array $args): Response
    {
        $pageId = (string)($args['page_id'] ?? '');
        $widgetId = (string)($args['widget_id'] ?? '');
        $data = $this->service->getWidgetData($pageId, $widgetId);

        return ApiResponse::envelope($response, $data);
    }
}
