<?php

declare(strict_types=1);

namespace Api\Admin\Schema\Controller;

use Api\Admin\Schema\Service\AdminSchemaService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminSchemaController
{
    public function __construct(private readonly AdminSchemaService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        return ApiResponse::envelope($response, $this->service->list());
    }

    /**
     * @param array<string, string> $args
     */
    public function get(Request $request, Response $response, array $args): Response
    {
        return ApiResponse::envelope(
            $response,
            $this->service->get((string)($args['domain'] ?? ''))
        );
    }
}
