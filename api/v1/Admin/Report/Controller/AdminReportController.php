<?php

/**
 * AdminReportController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Report\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Report\Controller;

use Api\Admin\Report\Service\AdminReportService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminReportController
{
    public function __construct(private readonly AdminReportService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $result = $this->service->list($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $reportId = (int)($args['report_id'] ?? 0);
        $payload = ApiResponse::parseJsonBody($request);
        $updated = $this->service->update($reportId, $payload);

        return ApiResponse::envelope($response, $updated);
    }

    public function stats(Request $request, Response $response): Response
    {
        $stats = $this->service->stats();

        return ApiResponse::envelope($response, $stats);
    }
}
