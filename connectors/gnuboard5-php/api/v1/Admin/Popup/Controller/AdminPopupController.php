<?php

/**
 * AdminPopupController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Popup\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Popup\Controller;

use Api\Admin\Popup\Service\AdminPopupService;
use Api\Support\Exception\ApiException;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminPopupController
{
    public function __construct(private readonly AdminPopupService $service)
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
        $popup = $this->service->detailAdmin($member, $this->toPositiveInt($args['nw_id'] ?? '0', 'nw_id'));

        return ApiResponse::envelope($response, $popup);
    }

    public function create(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->createAdmin($member, $payload);

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader('Location', '/api/v1/admin/popups/' . (string)($created['nw_id'] ?? ''));
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $updated = $this->service->updateAdmin(
            $this->toPositiveInt($args['nw_id'] ?? '0', 'nw_id'),
            $member,
            $payload
        );

        return ApiResponse::envelope($response, $updated);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $this->service->deleteAdmin($this->toPositiveInt($args['nw_id'] ?? '0', 'nw_id'), $member);

        return $response->withStatus(204);
    }

    public function active(Request $request, Response $response): Response
    {
        $result = $this->service->active($request->getQueryParams());
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
