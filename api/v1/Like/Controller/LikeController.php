<?php

/**
 * LikeController API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Like\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Like\Controller;

use Api\Like\Service\LikeService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class LikeController
{
    public function __construct(private readonly LikeService $likeService)
    {
    }

    public function vote(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $wrId = $this->toPositiveInt((string)($args['wr_id'] ?? '0'));
        $member = (array)$request->getAttribute('auth_member', []);
        $body = ApiResponse::parseJsonBody($request);
        $result = $this->likeService->vote($boTable, $wrId, $member, $body);

        return ApiResponse::envelope($response, $result);
    }

    private function toPositiveInt(string $value): int
    {
        if (!preg_match('/^(0|[1-9][0-9]*)$/', trim($value))) {
            throw \Api\Support\Exception\ApiException::badRequest('wr_id는 1 이상의 정수여야 합니다.');
        }

        $wrId = (int)$value;
        if ($wrId <= 0) {
            throw \Api\Support\Exception\ApiException::badRequest('wr_id는 1 이상의 정수여야 합니다.');
        }

        return $wrId;
    }
}
