<?php

/**
 * AdminPopularController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Popular\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Popular\Controller;

use Api\Admin\Popular\Service\AdminPopularService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminPopularController
{
    public function __construct(private readonly AdminPopularService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $result = $this->service->list($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function reset(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $result = $this->service->reset($payload);

        return ApiResponse::envelope($response, $result);
    }

    public function rank(Request $request, Response $response): Response
    {
        $items = $this->service->rank($request->getQueryParams());

        return ApiResponse::envelope($response, $items, [
            'total' => count($items),
            'page' => 1,
            'per_page' => count($items),
            'last_page' => 1,
            'has_next' => false,
            'has_prev' => false,
        ]);
    }
}
