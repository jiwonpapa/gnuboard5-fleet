<?php

/**
 * AdminVisitController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Visit\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Visit\Controller;

use Api\Admin\Visit\Service\AdminVisitService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminVisitController
{
    public function __construct(private readonly AdminVisitService $service)
    {
    }

    public function stats(Request $request, Response $response): Response
    {
        $result = $this->service->stats($request->getQueryParams());

        return ApiResponse::envelope($response, $result);
    }

    public function search(Request $request, Response $response): Response
    {
        $result = $this->service->search($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function delete(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $query = $request->getQueryParams();
        if (isset($query['before']) && !array_key_exists('before', $payload)) {
            $payload['before'] = $query['before'];
        }

        $result = $this->service->delete($payload);

        return ApiResponse::envelope($response, $result);
    }
}
