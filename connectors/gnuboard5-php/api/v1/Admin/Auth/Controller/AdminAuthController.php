<?php

/**
 * AdminAuthController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Auth\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Auth\Controller;

use Api\Admin\Auth\Service\AdminAuthService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminAuthController
{
    public function __construct(private readonly AdminAuthService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->service->list($member, $request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function upsert(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $result = $this->service->upsert((string)($args['mb_id'] ?? ''), $payload, $member);

        return ApiResponse::envelope($response, $result);
    }

    public function deleteByMember(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $this->service->deleteByMember((string)($args['mb_id'] ?? ''), $member);

        return $response->withStatus(204);
    }
}
