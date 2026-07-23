<?php

/**
 * ReportController API module.
 *
 * @package  Gnuboard5\Api\v1\Report\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Report\Controller;

use Api\Report\Service\ReportService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class ReportController
{
    public function __construct(private readonly ReportService $service)
    {
    }

    public function create(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->create($member, $payload);

        return ApiResponse::envelope($response, $created, null, [], 201);
    }
}
