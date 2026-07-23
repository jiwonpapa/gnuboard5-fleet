<?php

/**
 * DeviceController API module.
 *
 * @package  Gnuboard5\Api\v1\Device\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Device\Controller;

use Api\Device\Service\DeviceService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class DeviceController
{
    public function __construct(private readonly DeviceService $service)
    {
    }

    public function register(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $saved = $this->service->register($member, $payload);

        return ApiResponse::envelope($response, $saved, null, [], 201);
    }

    public function unregister(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $token = (string)($args['token'] ?? '');
        $this->service->unregister($member, $token);

        return $response->withStatus(204);
    }
}
