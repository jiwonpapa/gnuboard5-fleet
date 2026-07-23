<?php

/**
 * AdminMenuController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Menu\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Menu\Controller;

use Api\Admin\Menu\Service\AdminMenuService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminMenuController
{
    public function __construct(private readonly AdminMenuService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $menus = $this->service->list();

        return ApiResponse::envelope($response, $menus, [
            'total' => count($menus),
            'page' => 1,
            'per_page' => count($menus),
            'last_page' => 1,
            'has_next' => false,
            'has_prev' => false,
        ]);
    }

    public function detail(Request $request, Response $response, array $args): Response
    {
        $menu = $this->service->detail((int)($args['me_id'] ?? 0));

        return ApiResponse::envelope($response, $menu);
    }

    public function create(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->create($payload);

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader('Location', '/api/v1/admin/menus/' . (string)($created['me_id'] ?? ''));
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $updated = $this->service->update((int)($args['me_id'] ?? 0), $payload);

        return ApiResponse::envelope($response, $updated);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $this->service->delete((int)($args['me_id'] ?? 0));

        return $response->withStatus(204);
    }

    public function reorder(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $result = $this->service->reorder($payload);

        return ApiResponse::envelope($response, $result);
    }
}
