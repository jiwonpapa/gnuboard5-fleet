<?php

/**
 * BoardRewardController API module.
 *
 * @package  Gnuboard5\Api\Plugins\Wolchuck\BoardReward\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Plugins\Wolchuck\BoardReward\Controller;

use Api\Plugins\Wolchuck\BoardReward\Service\BoardRewardService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class BoardRewardController
{
    public function __construct(private readonly BoardRewardService $service)
    {
    }

    public function showBoard(Request $request, Response $response, array $args): Response
    {
        $boardId = trim((string)($args['bo_table'] ?? ''));

        return ApiResponse::json($response, $this->service->getBoardSummary($boardId));
    }

    public function previewReward(Request $request, Response $response): Response
    {
        return ApiResponse::json($response, $this->service->previewReward(ApiResponse::parseJsonBody($request)));
    }

    public function grantReward(Request $request, Response $response): Response
    {
        return ApiResponse::json($response, $this->service->grantReward(ApiResponse::parseJsonBody($request)));
    }
}
