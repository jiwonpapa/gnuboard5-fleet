<?php

/**
 * AdminPointController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Point\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Point\Controller;

use Api\Admin\Point\Service\AdminPointService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminPointController
{
    public function __construct(private readonly AdminPointService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $result = $this->service->list($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function create(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $authMember = (array)$request->getAttribute('auth_member', []);
        $actorId = trim((string)($authMember['mb_id'] ?? 'admin'));

        return ApiResponse::envelope($response, $this->service->executeAction($payload, $actorId));
    }

    public function grant(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $authMember = (array)$request->getAttribute('auth_member', []);
        $actorId = trim((string)($authMember['mb_id'] ?? 'admin'));

        $result = $this->service->grant($payload, $actorId);

        return ApiResponse::envelope($response, $result);
    }

    public function deduct(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $authMember = (array)$request->getAttribute('auth_member', []);
        $actorId = trim((string)($authMember['mb_id'] ?? 'admin'));

        $result = $this->service->deduct($payload, $actorId);

        return ApiResponse::envelope($response, $result);
    }

    public function delete(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $result = $this->service->delete($payload);

        return ApiResponse::envelope($response, $result);
    }

    public function summary(Request $request, Response $response): Response
    {
        $result = $this->service->summary($request->getQueryParams());

        return ApiResponse::envelope($response, $result);
    }

    public function expire(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $result = $this->service->expire($payload);

        return ApiResponse::envelope($response, $result);
    }
}
