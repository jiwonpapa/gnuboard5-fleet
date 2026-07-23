<?php

/**
 * AdminConfigController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Config\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Config\Controller;

use Api\Admin\Config\Service\AdminConfigService;
use Api\Admin\Config\Support\AdminConfigRequestGuard;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminConfigController
{
    public function __construct(
        private readonly AdminConfigService $service,
        private readonly ?AdminConfigRequestGuard $requestGuard = null,
    )
    {
    }

    public function get(Request $request, Response $response): Response
    {
        return ApiResponse::envelope($response, $this->service->get());
    }

    public function update(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $this->requestGuard()->assertUpdateAllowed(
            $payload,
            (string)($request->getServerParams()['REMOTE_ADDR'] ?? ''),
        );

        return ApiResponse::envelope($response, $this->service->update($payload));
    }

    private function requestGuard(): AdminConfigRequestGuard
    {
        return $this->requestGuard ?? new AdminConfigRequestGuard();
    }
}
