<?php

/**
 * AdminWriteCountController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\WriteCount\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\WriteCount\Controller;

use Api\Admin\WriteCount\Service\AdminWriteCountService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminWriteCountController
{
    public function __construct(private readonly AdminWriteCountService $service)
    {
    }

    public function stats(Request $request, Response $response): Response
    {
        $result = $this->service->stats($request->getQueryParams());

        return ApiResponse::envelope($response, $result);
    }
}
