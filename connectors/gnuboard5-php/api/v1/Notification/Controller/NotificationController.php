<?php

/**
 * NotificationController API module.
 *
 * @package  Gnuboard5\Api\v1\Notification\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Notification\Controller;

use Api\Notification\Service\NotificationService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class NotificationController
{
    public function __construct(private readonly NotificationService $service)
    {
    }

    public function listMy(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $query = $request->getQueryParams();
        $page = (int)($query['page'] ?? 1);
        $perPage = (int)($query['per_page'] ?? 20);
        $cursor = is_string($query['cursor'] ?? null) ? trim((string)$query['cursor']) : null;

        $result = $this->service->listMyNotifications($member, $page, $perPage, $cursor);

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function updateSettings(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $saved = $this->service->updateSettings($member, $payload);

        return ApiResponse::envelope($response, $saved);
    }
}
