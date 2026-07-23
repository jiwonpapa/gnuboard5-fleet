<?php

/**
 * AdminBoardController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Board\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Board\Controller;

use Api\Admin\Board\Service\AdminBoardService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminBoardController
{
    public function __construct(private readonly AdminBoardService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $result = $this->service->list($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function detail(Request $request, Response $response, array $args): Response
    {
        $board = $this->service->detail((string)($args['bo_table'] ?? ''));

        return ApiResponse::envelope($response, $board);
    }

    public function create(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->create($payload);

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader('Location', '/api/v1/admin/boards/' . (string)($created['bo_table'] ?? ''));
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $updated = $this->service->update((string)($args['bo_table'] ?? ''), $payload);

        return ApiResponse::envelope($response, $updated);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $this->service->delete((string)($args['bo_table'] ?? ''));

        return $response->withStatus(204);
    }

    public function copy(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $copied = $this->service->copy((string)($args['bo_table'] ?? ''), $payload);

        return ApiResponse::envelope($response, $copied, null, [], 201)
            ->withHeader('Location', '/api/v1/admin/boards/' . rawurlencode((string)($copied['bo_table'] ?? '')));
    }
}
