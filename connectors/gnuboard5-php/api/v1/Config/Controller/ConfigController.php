<?php

/**
 * ConfigController API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Config\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Config\Controller;

use Api\Config\Service\ConfigService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class ConfigController
{
    public function __construct(private readonly ConfigService $configService)
    {
    }

    public function getConfig(Request $request, Response $response): Response
    {
        $config = $this->configService->getPublicConfig();
        return ApiResponse::envelope($response, $config);
    }
}
