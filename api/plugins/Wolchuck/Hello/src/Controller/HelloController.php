<?php

/**
 * HelloController API module.
 *
 * @package  Gnuboard5\Api\Plugins\Wolchuck\Hello\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Plugins\Wolchuck\Hello\Controller;

use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class HelloController
{
    public function greet(Request $request, Response $response): Response
    {
        return ApiResponse::json($response, [
            'message' => 'Hello from HelloPlugin!',
            'version' => '1.0.0',
        ]);
    }

    public function info(Request $request, Response $response): Response
    {
        return ApiResponse::json($response, [
            'plugin' => 'hello',
            'vendor' => 'wolchuck',
            'api_version' => '1.1.0',
        ]);
    }
}
