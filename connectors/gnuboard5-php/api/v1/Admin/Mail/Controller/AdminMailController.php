<?php

/**
 * AdminMailController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Mail\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Mail\Controller;

use Api\Admin\Mail\Service\AdminMailService;
use Api\Support\Exception\ApiException;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminMailController
{
    public function __construct(private readonly AdminMailService $service)
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
        $result = $this->service->detailAdmin($member, $this->toPositiveInt($args['ma_id'] ?? '0', 'ma_id'));

        return ApiResponse::envelope($response, $result);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $this->service->deleteAdmin($member, $this->toPositiveInt($args['ma_id'] ?? '0', 'ma_id'));

        return $response->withStatus(204);
    }

    public function create(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $ip = trim((string)($request->getAttribute('client_ip', '') ?: ($request->getServerParams()['REMOTE_ADDR'] ?? '')));
        $created = $this->service->createAdmin($member, $payload, $ip);

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader('Location', '/api/v1/admin/mails/' . (string)($created['ma_id'] ?? ''));
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $ip = trim((string)($request->getAttribute('client_ip', '') ?: ($request->getServerParams()['REMOTE_ADDR'] ?? '')));
        $updated = $this->service->updateAdmin(
            $member,
            $this->toPositiveInt($args['ma_id'] ?? '0', 'ma_id'),
            $payload,
            $ip
        );

        return ApiResponse::envelope($response, $updated);
    }

    public function recipients(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->service->recipients($member, $request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function send(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $ip = trim((string)($request->getAttribute('client_ip', '') ?: ($request->getServerParams()['REMOTE_ADDR'] ?? '')));
        $result = $this->service->send($member, $payload, $ip);

        return ApiResponse::envelope($response, $result);
    }

    public function sendTest(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $ip = trim((string)($request->getAttribute('client_ip', '') ?: ($request->getServerParams()['REMOTE_ADDR'] ?? '')));
        $result = $this->service->sendTest($member, $payload, $ip);

        return ApiResponse::envelope($response, $result);
    }

    private function toPositiveInt(mixed $value, string $field): int
    {
        $intValue = is_int($value) ? $value : (is_numeric($value) ? (int)$value : null);
        if ($intValue === null || $intValue <= 0) {
            throw ApiException::badRequest($field . '는 1 이상의 정수여야 합니다.');
        }

        return $intValue;
    }
}
