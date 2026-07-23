<?php

/**
 * BlockController API module.
 *
 * @package  Gnuboard5\Api\v1\Block\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Block\Controller;

use Api\Block\Service\BlockService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class BlockController
{
    public function __construct(private readonly BlockService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $query = $request->getQueryParams();
        $page = (int)($query['page'] ?? 1);
        $perPage = (int)($query['per_page'] ?? 20);
        $cursor = is_string($query['cursor'] ?? null) ? trim((string)$query['cursor']) : null;
        $result = $this->service->listMine($member, $page, $perPage, $cursor);

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function create(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $saved = $this->service->block($member, $payload);

        return ApiResponse::envelope($response, $saved, null, [], 201);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $blockedMemberId = (string)($args['mb_id'] ?? '');
        $this->service->unblock($member, $blockedMemberId);

        return $response->withStatus(204);
    }
}
