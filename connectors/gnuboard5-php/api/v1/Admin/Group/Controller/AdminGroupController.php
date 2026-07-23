<?php

/**
 * AdminGroupController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Group\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Group\Controller;

use Api\Admin\Group\Service\AdminGroupService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminGroupController
{
    public function __construct(private readonly AdminGroupService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $groups = $this->service->list();

        return ApiResponse::envelope($response, $groups, [
            'total' => count($groups),
            'page' => 1,
            'per_page' => count($groups),
            'last_page' => 1,
            'has_next' => false,
            'has_prev' => false,
        ]);
    }

    public function detail(Request $request, Response $response, array $args): Response
    {
        $group = $this->service->detail((string)($args['gr_id'] ?? ''));

        return ApiResponse::envelope($response, $group);
    }

    public function create(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->create($payload);

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader(
                'Location',
                '/api/v1/admin/board-groups/' . rawurlencode((string)($created['gr_id'] ?? ''))
            );
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $updated = $this->service->update((string)($args['gr_id'] ?? ''), $payload);

        return ApiResponse::envelope($response, $updated);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $this->service->delete((string)($args['gr_id'] ?? ''));

        return $response->withStatus(204);
    }

    public function listMembers(Request $request, Response $response, array $args): Response
    {
        $result = $this->service->listMembers((string)($args['gr_id'] ?? ''), $request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function addMember(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->addMember((string)($args['gr_id'] ?? ''), $payload);

        $location = '/api/v1/admin/board-groups/' . rawurlencode((string)($created['gr_id'] ?? ''))
            . '/members/' . rawurlencode((string)($created['mb_id'] ?? ''));

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader('Location', $location);
    }

    public function removeMember(Request $request, Response $response, array $args): Response
    {
        $this->service->removeMember((string)($args['gr_id'] ?? ''), (string)($args['mb_id'] ?? ''));

        return $response->withStatus(204);
    }
}
