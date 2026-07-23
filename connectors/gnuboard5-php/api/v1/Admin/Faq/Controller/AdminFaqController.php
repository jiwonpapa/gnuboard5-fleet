<?php

/**
 * AdminFaqController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Faq\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Faq\Controller;

use Api\Admin\Faq\Service\AdminFaqService;
use Api\Support\Http\ApiResponse;
use Api\Support\Exception\ApiException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;

final class AdminFaqController
{
    public function __construct(private readonly AdminFaqService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $result = $this->service->list($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function detail(Request $request, Response $response, array $args): Response
    {
        $faq = $this->service->detail((int)($args['fa_id'] ?? 0));

        return ApiResponse::envelope($response, $faq);
    }

    public function create(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->create($payload);

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader('Location', '/api/v1/admin/faqs/' . (string)($created['fa_id'] ?? ''));
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $updated = $this->service->update((int)($args['fa_id'] ?? 0), $payload);

        return ApiResponse::envelope($response, $updated);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $this->service->delete((int)($args['fa_id'] ?? 0));

        return $response->withStatus(204);
    }

    public function listMasters(Request $request, Response $response): Response
    {
        $result = $this->service->listMasters($request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function detailMaster(Request $request, Response $response, array $args): Response
    {
        $master = $this->service->detailMaster((int)($args['fm_id'] ?? 0));

        return ApiResponse::envelope($response, $master);
    }

    public function createMaster(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $created = $this->service->createMaster($payload);

        return ApiResponse::envelope($response, $created, null, [], 201)
            ->withHeader('Location', '/api/v1/admin/faq-masters/' . (string)($created['fm_id'] ?? ''));
    }

    public function updateMaster(Request $request, Response $response, array $args): Response
    {
        $payload = ApiResponse::parseJsonBody($request);
        $updated = $this->service->updateMaster((int)($args['fm_id'] ?? 0), $payload);

        return ApiResponse::envelope($response, $updated);
    }

    public function deleteMaster(Request $request, Response $response, array $args): Response
    {
        $this->service->deleteMaster((int)($args['fm_id'] ?? 0));

        return $response->withStatus(204);
    }

    public function uploadHeaderImage(Request $request, Response $response, array $args): Response
    {
        $uploadedFile = $this->pickUploadedFile($request, ['image', 'header_image', 'fm_himg', 'file']);
        $result = $this->service->uploadMasterHeaderImage((int)($args['fm_id'] ?? 0), $uploadedFile);

        return ApiResponse::envelope($response, $result);
    }

    public function deleteHeaderImage(Request $request, Response $response, array $args): Response
    {
        $result = $this->service->deleteMasterHeaderImage((int)($args['fm_id'] ?? 0));

        return ApiResponse::envelope($response, $result);
    }

    public function uploadFooterImage(Request $request, Response $response, array $args): Response
    {
        $uploadedFile = $this->pickUploadedFile($request, ['image', 'footer_image', 'fm_timg', 'file']);
        $result = $this->service->uploadMasterFooterImage((int)($args['fm_id'] ?? 0), $uploadedFile);

        return ApiResponse::envelope($response, $result);
    }

    public function deleteFooterImage(Request $request, Response $response, array $args): Response
    {
        $result = $this->service->deleteMasterFooterImage((int)($args['fm_id'] ?? 0));

        return ApiResponse::envelope($response, $result);
    }

    /**
     * @param array<int,string> $candidates
     */
    private function pickUploadedFile(Request $request, array $candidates): ?UploadedFileInterface
    {
        $uploadedFiles = $request->getUploadedFiles();
        $unknown = array_values(array_diff(array_keys($uploadedFiles), $candidates));
        if ($unknown !== []) {
            throw ApiException::badRequest('허용되지 않은 업로드 필드가 있습니다: ' . implode(', ', $unknown));
        }

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
