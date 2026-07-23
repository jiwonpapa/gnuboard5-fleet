<?php

/**
 * AdminPushController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Push\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Push\Controller;

use Api\Admin\Push\Service\AdminPushService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminPushController
{
    public function __construct(private readonly AdminPushService $service)
    {
    }

    public function send(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $authMember = (array)$request->getAttribute('auth_member', []);
        $actorId = trim((string)($authMember['mb_id'] ?? 'admin'));

        $result = $this->service->send($payload, $actorId);

        return ApiResponse::envelope($response, $result);
    }
}
