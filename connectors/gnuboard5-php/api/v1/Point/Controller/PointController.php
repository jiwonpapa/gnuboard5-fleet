<?php

/**
 * PointController API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Point\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Point\Controller;

use Api\Point\Service\PointService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class PointController
{
    public function __construct(private readonly PointService $pointService)
    {
    }

    public function listMyPoints(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $query = $request->getQueryParams();

        $page = $this->toPositiveInt((string)($query['page'] ?? 1), 1);
        $perPage = $this->toPositiveInt((string)($query['per_page'] ?? 20), 20);
        $cursor = is_string($query['cursor'] ?? null) ? trim((string)$query['cursor']) : null;

        $result = $this->pointService->getMyPointHistory($member, $page, $perPage, $cursor);
        $pagination = $result['pagination'];

        return ApiResponse::envelope($response, $result['items'], $pagination);
    }

    private function toPositiveInt(mixed $value, int $default): int
    {
        $value = is_int($value) ? $value : (is_numeric((string)$value) ? (int)$value : $default);
        if ($value <= 0) {
            return $default;
        }

        if ($value > 100 && $default === 20) {
            return 100;
        }

        return $value;
    }
}
