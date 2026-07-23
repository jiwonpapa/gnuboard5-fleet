<?php

/**
 * BoardController API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Board\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Board\Controller;

use Api\Board\Service\BoardService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class BoardController
{
    public function __construct(private readonly BoardService $boardService)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $query = $request->getQueryParams();
        $groupId = $query['group_id'] ?? null;

        $memberLevel = null;
        if (is_array($request->getAttribute('auth_member', null)) && is_array($request->getAttribute('auth_member'))) {
            $memberLevel = (int)($request->getAttribute('auth_member')['mb_level'] ?? 255);
        }

        $boards = $this->boardService->listBoards(
            is_string($groupId) ? $groupId : null,
            $memberLevel
        );

        return ApiResponse::envelope($response, $boards, [
            'total' => count($boards),
        ]);
    }

    public function detail(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $board = $this->boardService->getBoard($boTable);

        return ApiResponse::envelope($response, $board);
    }
}
