<?php

/**
 * MemoController API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Memo\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Memo\Controller;

use Api\Memo\Service\MemoService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class MemoController
{
    public function __construct(private readonly MemoService $memoService)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $query = $request->getQueryParams();

        $result = $this->memoService->list($member, $query);

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function unreadCount(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->memoService->unreadCount($member);

        return ApiResponse::envelope($response, $result);
    }

    public function detail(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $query = $request->getQueryParams();
        $kind = (string)($query['kind'] ?? 'recv');
        $meId = is_numeric((string)($args['me_id'] ?? '')) ? (int)$args['me_id'] : 0;

        $result = $this->memoService->detail($member, $meId, $kind);

        return ApiResponse::envelope($response, $result);
    }

    public function send(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $server = $request->getServerParams();
        $ip = trim((string)($server['REMOTE_ADDR'] ?? ''));

        $result = $this->memoService->send($member, $payload, $ip);

        return ApiResponse::envelope($response, $result, null, [], 201);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $meId = is_numeric((string)($args['me_id'] ?? '')) ? (int)$args['me_id'] : 0;
        $result = $this->memoService->delete($member, $meId);

        return ApiResponse::envelope($response, $result);
    }
}
