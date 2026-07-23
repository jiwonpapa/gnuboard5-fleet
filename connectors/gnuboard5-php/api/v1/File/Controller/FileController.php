<?php

/**
 * FileController API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\File\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\File\Controller;

use Api\File\Service\FileService;
use Api\File\Service\Support\FilePublicPresenter;
use Api\Support\Http\ApiResponse;
use Api\Support\Exception\ApiException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;
use Slim\Psr7\Stream;

final class FileController
{
    private readonly FilePublicPresenter $presenter;

    public function __construct(
        private readonly FileService $fileService,
        ?FilePublicPresenter $presenter = null,
    ) {
        $this->presenter = $presenter ?? new FilePublicPresenter();
    }

    public function uploadToPost(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $wrId = $this->toPositiveInt($args['wr_id'] ?? '0', null);
        $member = (array)$request->getAttribute('auth_member', []);
        $uploadedFile = $this->resolveUploadedFile($request);

        $file = $this->fileService->uploadFile($boTable, $member, ['wr_id' => $wrId], $uploadedFile);

        $location = '/api/v1/boards/' . rawurlencode($boTable) . '/posts/' . $wrId . '/files/' . (int)$file['bf_no'] . '/download';
        $response = $response->withHeader('Location', $location)->withStatus(201);

        return ApiResponse::envelope($response, $this->presenter->present($file));
    }

    public function listByPost(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $wrId = $this->toPositiveInt($args['wr_id'] ?? '0', null);
        $member = (array)$request->getAttribute('auth_member', []);

        $result = $this->fileService->listFiles($boTable, $wrId, $member);

        $items = [];
        foreach ((array)($result['items'] ?? []) as $file) {
            if (is_array($file)) {
                $items[] = $this->presenter->present($file);
            }
        }

        return ApiResponse::envelope($response, $items, [
            'total' => (int)($result['total'] ?? 0),
            'page' => 1,
            'per_page' => (int)($result['total'] ?? 0),
            'last_page' => 1,
            'has_next' => false,
            'has_prev' => false,
        ]);
    }

    public function downloadByPost(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $wrId = $this->toPositiveInt($args['wr_id'] ?? '0', null);
        $bfNo = $this->toNonNegativeInt($args['bf_no'] ?? '0', null);
        $member = (array)$request->getAttribute('auth_member', []);

        return $this->streamDownload($response, $this->fileService->getDownloadPayload($boTable, $wrId, $bfNo, $member));
    }

    public function deleteByPost(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $wrId = $this->toPositiveInt($args['wr_id'] ?? '0', null);
        $bfNo = $this->toNonNegativeInt($args['bf_no'] ?? '0', null);
        $member = (array)$request->getAttribute('auth_member', []);

        $this->fileService->deleteFile($boTable, $wrId, $bfNo, $member);

        return $response->withStatus(204);
    }

    public function upload(Request $request, Response $response): Response
    {
        $body = is_array($request->getParsedBody()) ? $request->getParsedBody() : [];
        $unknown = array_values(array_diff(array_keys($body), ['bo_table', 'wr_id']));
        if ($unknown !== []) {
            throw ApiException::badRequest('파일 업로드 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown));
        }
        $boTable = (string)($body['bo_table'] ?? '');
        $wrId = $this->toNonNegativeInt($body['wr_id'] ?? 0, 0);
        $member = (array)$request->getAttribute('auth_member', []);
        $uploadedFile = $this->resolveUploadedFile($request);

        $file = $this->fileService->uploadFile($boTable, $member, ['wr_id' => $wrId], $uploadedFile);

        $location = '/api/v1/files/' . rawurlencode($boTable) . '/' . (int)$file['wr_id'] . '/' . (int)$file['bf_no'];
        $response = $response->withHeader('Location', $location)->withStatus(201);

        return ApiResponse::envelope($response, $this->presenter->present($file));
    }

    public function download(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $wrId = $this->toPositiveInt($args['wr_id'] ?? '0', null);
        $bfNo = $this->toNonNegativeInt($args['bf_no'] ?? '0', null);
        $member = (array)$request->getAttribute('auth_member', []);

        return $this->streamDownload($response, $this->fileService->getDownloadPayload($boTable, $wrId, $bfNo, $member));
    }

    /**
     * @param array<string, mixed> $file
     */
    private function streamDownload(Response $response, array $file): Response
    {
        $path = (string)($file['path'] ?? '');
        $filename = (string)($file['bf_source'] ?? '');
        $wrId = (int)($file['wr_id'] ?? 0);
        $bfNo = (int)($file['bf_no'] ?? 0);
        if ($filename === '') {
            $filename = 'file_' . $wrId . '_' . $bfNo;
        }

        $resource = fopen($path, 'rb');
        if ($resource === false) {
            throw ApiException::serverError('다운로드 파일을 열 수 없습니다.');
        }

        $stream = new Stream($resource);
        $quotedName = str_replace('"', '\\"', $filename);
        $encodedName = rawurlencode($filename);
        $disposition = "attachment; filename=\"{$quotedName}\"; filename*=UTF-8''{$encodedName}";
        $mime = array_key_exists('bf_file_mime', $file) ? (string)$file['bf_file_mime'] : 'application/octet-stream';
        $size = (int)($file['bf_filesize'] ?? 0);

        return $response
            ->withHeader('Content-Type', $mime)
            ->withHeader('Content-Length', (string)$size)
            ->withHeader('Content-Disposition', $disposition)
            ->withHeader('Content-Transfer-Encoding', 'binary')
            ->withHeader('Pragma', 'no-cache')
            ->withHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
            ->withBody($stream)
            ->withStatus(200);
    }

    private function resolveUploadedFile(Request $request): ?UploadedFileInterface
    {
        $uploadedFile = null;
        $files = $request->getUploadedFiles();
        $unknown = array_values(array_diff(array_keys($files), ['file']));
        if ($unknown !== []) {
            throw ApiException::badRequest('허용되지 않은 업로드 파일 필드가 있습니다: ' . implode(', ', $unknown));
        }

        if (isset($files['file'])) {
            $candidate = $files['file'];
            if (is_array($candidate)) {
                $uploadedFile = $candidate[0] ?? null;
            } elseif ($candidate instanceof UploadedFileInterface) {
                $uploadedFile = $candidate;
            }
        }

        return $uploadedFile;
    }

    private function toPositiveInt(mixed $value, ?int $default): int
    {
        $value = is_int($value) ? $value : (is_numeric($value) ? (int)$value : null);
        if ($value === null || $value <= 0) {
            if ($default === null) {
                throw ApiException::badRequest('유효하지 않은 정수 값입니다.');
            }

            return $default;
        }

        return $value;
    }

    private function toNonNegativeInt(mixed $value, ?int $default): int
    {
        $value = is_int($value) ? $value : (is_numeric($value) ? (int)$value : null);
        if ($value === null || $value < 0) {
            if ($default === null) {
                throw ApiException::badRequest('유효하지 않은 정수 값입니다.');
            }

            return $default;
        }

        return $value;
    }
}
