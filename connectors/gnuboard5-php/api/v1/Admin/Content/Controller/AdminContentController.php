<?php

/**
 * AdminContentController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Content\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Content\Controller;

use Api\Admin\Content\Service\AdminContentService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminContentController
{
    public function __construct(private readonly AdminContentService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $result = $this->service->list($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function detail(Request $request, Response $response, array $args): Response
    {
        $item = $this->service->detail((string)($args['co_id'] ?? ''));

        return ApiResponse::envelope($response, $item);
    }

    public function create(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->create($payload);

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader('Location', '/api/v1/admin/contents/' . (string)($created['co_id'] ?? ''));
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $updated = $this->service->update((string)($args['co_id'] ?? ''), $payload);

        return ApiResponse::envelope($response, $updated);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $this->service->delete((string)($args['co_id'] ?? ''));

        return $response->withStatus(204);
    }
}
