<?php

declare(strict_types=1);

namespace Api\Admin\Dashboard\Controller;

use Api\Admin\Dashboard\Service\AdminDashboardService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminDashboardController
{
    public function __construct(private readonly AdminDashboardService $service)
    {
    }

    public function overview(Request $request, Response $response): Response
    {
        $result = $this->service->overview($request->getQueryParams());

        return ApiResponse::envelope($response, $result);
    }
}
