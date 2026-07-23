<?php

/**
 * AdminPollController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Poll\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Poll\Controller;

use Api\Admin\Poll\Service\AdminPollService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminPollController
{
    public function __construct(private readonly AdminPollService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->service->listAdmin($member, $request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function detail(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $pollId = $this->toPositiveInt($args['po_id'] ?? '0', 'po_id');
        $result = $this->service->detailAdmin($member, $pollId);

        return ApiResponse::envelope($response, $result);
    }

    public function create(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->createAdmin($member, $payload);

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader('Location', '/api/v1/admin/polls/' . (string)($created['po_id'] ?? ''));
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $pollId = $this->toPositiveInt($args['po_id'] ?? '0', 'po_id');
        $payload = ApiResponse::parseJsonBody($request);
        $updated = $this->service->updateAdmin($pollId, $member, $payload);

        return ApiResponse::envelope($response, $updated);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $pollId = $this->toPositiveInt($args['po_id'] ?? '0', 'po_id');
        $this->service->deleteAdmin($pollId, $member);

        return $response->withStatus(204);
    }

    public function active(Request $request, Response $response): Response
    {
        $member = (array)($request->getAttribute('auth_member', []));
        $result = $this->service->active($member);

        return ApiResponse::envelope($response, $result);
    }

    public function vote(Request $request, Response $response, array $args): Response
    {
        $pollId = $this->toPositiveInt($args['po_id'] ?? '0', 'po_id');
        $payload = ApiResponse::parseJsonBody($request);
        $member = (array)($request->getAttribute('auth_member', []));
        $ip = trim((string)($request->getAttribute('client_ip', '') ?: ($request->getServerParams()['REMOTE_ADDR'] ?? '')));

        $result = $this->service->vote($pollId, $payload, $member, $ip);
        return ApiResponse::envelope($response, $result);
    }

    public function result(Request $request, Response $response, array $args): Response
    {
        $pollId = $this->toPositiveInt($args['po_id'] ?? '0', 'po_id');
        $result = $this->service->result($pollId);

        return ApiResponse::envelope($response, $result);
    }

    private function toPositiveInt(mixed $value, string $field): int
    {
        $intValue = is_int($value) ? $value : (is_numeric($value) ? (int)$value : null);
        if ($intValue === null || $intValue <= 0) {
            throw \Api\Support\Exception\ApiException::badRequest($field . '는 1 이상의 정수여야 합니다.');
        }

        return $intValue;
    }
}
