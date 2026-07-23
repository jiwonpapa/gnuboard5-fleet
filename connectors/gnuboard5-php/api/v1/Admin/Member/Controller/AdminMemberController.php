<?php

/**
 * AdminMemberController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Member\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Member\Controller;

use Api\Admin\Member\Service\AdminMemberService;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;

final class AdminMemberController
{
    public function __construct(private readonly AdminMemberService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $result = $this->service->list($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function detail(Request $request, Response $response, array $args): Response
    {
        $member = $this->service->detail((string)($args['mb_id'] ?? ''));

        return ApiResponse::envelope($response, $member);
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $actor = (array)$request->getAttribute('auth_member', []);
        $member = $this->service->update((string)($args['mb_id'] ?? ''), $payload, $actor);

        return ApiResponse::envelope($response, $member);
    }

    public function updateLevel(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $level = (int)($payload['mb_level'] ?? 0);
        $actor = (array)$request->getAttribute('auth_member', []);

        $member = $this->service->updateLevel((string)($args['mb_id'] ?? ''), $level, $actor);

        return ApiResponse::envelope($response, $member);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $actor = (array)$request->getAttribute('auth_member', []);
        $this->service->delete((string)($args['mb_id'] ?? ''), $actor);

        return $response->withStatus(204);
    }

    public function exportExcel(Request $request, Response $response): Response
    {
        $items = $this->service->exportExcel($request->getQueryParams());

        return ApiResponse::envelope($response, $items, [
            'total' => count($items),
            'page' => 1,
            'per_page' => count($items),
            'last_page' => 1,
            'has_next' => false,
            'has_prev' => false,
        ]);
    }

    public function uploadIcon(Request $request, Response $response, array $args): Response
    {
        $uploadedFile = $this->pickUploadedFile($request, ['icon', 'mb_icon', 'file']);
        $result = $this->service->uploadIcon((string)($args['mb_id'] ?? ''), $uploadedFile);

        return ApiResponse::envelope($response, $result);
    }

    public function deleteIcon(Request $request, Response $response, array $args): Response
    {
        $result = $this->service->deleteIcon((string)($args['mb_id'] ?? ''));

        return ApiResponse::envelope($response, $result);
    }

    public function uploadImage(Request $request, Response $response, array $args): Response
    {
        $uploadedFile = $this->pickUploadedFile($request, ['image', 'mb_img', 'file']);
        $result = $this->service->uploadImage((string)($args['mb_id'] ?? ''), $uploadedFile);

        return ApiResponse::envelope($response, $result);
    }

    public function deleteImage(Request $request, Response $response, array $args): Response
    {
        $result = $this->service->deleteImage((string)($args['mb_id'] ?? ''));

        return ApiResponse::envelope($response, $result);
    }

    /**
     * @param array<int, string> $candidates
     */
    private function pickUploadedFile(Request $request, array $candidates): ?UploadedFileInterface
    {
        $uploadedFiles = $request->getUploadedFiles();
        foreach ($candidates as $key) {
            if (!array_key_exists($key, $uploadedFiles)) {
                continue;
            }

            $candidate = $uploadedFiles[$key];
            if ($candidate instanceof UploadedFileInterface) {
                return $candidate;
            }
            if (is_array($candidate) && isset($candidate[0]) && $candidate[0] instanceof UploadedFileInterface) {
                return $candidate[0];
            }
        }

        return null;
    }
}
