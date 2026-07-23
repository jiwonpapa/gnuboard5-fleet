<?php

/**
 * CorsMiddleware API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Middlewares
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Middlewares;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response as SlimResponse;

final class CorsMiddleware implements MiddlewareInterface
{
    /** @param string[] $allowedOrigins */
    public function __construct(
        private readonly array $allowedOrigins = ['*']
    ) {
    }

    public function process(Request $request, RequestHandlerInterface $handler): Response
    {
        $requestOrigin = trim($request->getHeaderLine('Origin'));

        $isAllowed = $this->isOriginAllowed($requestOrigin);

        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            $preflight = new SlimResponse(204);
            return $this->decorateCorsHeaders($preflight, $requestOrigin, $isAllowed)
                ->withHeader('Access-Control-Max-Age', '86400');
        }

        $response = $handler->handle($request);
        return $this->decorateCorsHeaders($response, $requestOrigin, $isAllowed);
    }

    private function isOriginAllowed(string $origin): bool
    {
        if ($origin === '') {
            return false;
        }

        if (in_array('*', $this->allowedOrigins, true)) {
            return true;
        }

        return in_array($origin, $this->allowedOrigins, true);
    }

    private function decorateCorsHeaders(Response $response, string $origin, bool $isAllowed): Response
    {
        if (!$isAllowed) {
            return $response
                ->withHeader('Vary', 'Origin')
                ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->withHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Request-Id')
                ->withHeader('Access-Control-Allow-Credentials', 'false');
        }

        if (in_array('*', $this->allowedOrigins, true)) {
            return $response
                ->withHeader('Access-Control-Allow-Origin', '*')
                ->withHeader('Vary', 'Origin')
                ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->withHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Request-Id')
                ->withHeader('Access-Control-Allow-Credentials', 'false')
                ->withHeader('Access-Control-Max-Age', '86400');
        }

        return $response
            ->withHeader('Access-Control-Allow-Origin', $origin)
            ->withHeader('Vary', 'Origin')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->withHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Request-Id')
            ->withHeader('Access-Control-Allow-Credentials', 'false')
            ->withHeader('Access-Control-Max-Age', '86400');
    }
}
