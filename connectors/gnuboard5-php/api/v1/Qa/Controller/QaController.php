<?php

/**
 * QaController API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Qa\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Controller;

use Api\Qa\Service\QaService;
use Api\Support\Exception\ApiException;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;
use Slim\Psr7\Stream;

final class QaController
{
    public function __construct(private readonly QaService $qaService)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $result = $this->qaService->list($member, $request->getQueryParams());

        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function detail(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $qaId = $this->toPositiveInt($args['qa_id'] ?? '0', 'qa_id');

        $detail = $this->qaService->detail($member, $qaId);
        return ApiResponse::envelope($response, $detail);
    }

    public function create(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = $this->parsePayload($request);
        $files = $this->extractQaFiles($request);
        $ip = $this->resolveClientIp($request);

        $created = $this->qaService->createQuestion($member, $payload, $files, $ip);
        $qaId = (int)($created['qa_id'] ?? 0);
        $response = $response->withHeader('Location', '/api/v1/qa/' . $qaId)->withStatus(201);

        return ApiResponse::envelope($response, $created);
    }

    public function answer(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $parentQaId = $this->toPositiveInt($args['qa_id'] ?? '0', 'qa_id');
        $payload = $this->parsePayload($request);
        $files = $this->extractQaFiles($request);
        $ip = $this->resolveClientIp($request);

        $created = $this->qaService->createAnswer($parentQaId, $member, $payload, $files, $ip);
        $qaId = (int)($created['qa_id'] ?? 0);
        $response = $response->withHeader('Location', '/api/v1/qa/' . $qaId)->withStatus(201);

        return ApiResponse::envelope($response, $created);
    }

    public function related(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $relatedQaId = $this->toPositiveInt($args['qa_id'] ?? '0', 'qa_id');
        $payload = $this->parsePayload($request);
        $files = $this->extractQaFiles($request);
        $ip = $this->resolveClientIp($request);

        $created = $this->qaService->createRelatedQuestion($relatedQaId, $member, $payload, $files, $ip);
        $qaId = (int)($created['qa_id'] ?? 0);
        $response = $response->withHeader('Location', '/api/v1/qa/' . $qaId)->withStatus(201);

        return ApiResponse::envelope($response, $created);
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $qaId = $this->toPositiveInt($args['qa_id'] ?? '0', 'qa_id');
        $payload = $this->parsePayload($request);
        $files = $this->extractQaFiles($request);
        $ip = $this->resolveClientIp($request);

        $updated = $this->qaService->updateQuestion($qaId, $member, $payload, $files, $ip);
        return ApiResponse::envelope($response, $updated);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $qaId = $this->toPositiveInt($args['qa_id'] ?? '0', 'qa_id');

        $this->qaService->deleteQuestion($qaId, $member);
        return $response->withStatus(204);
    }

    public function bulkDelete(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $unknown = array_values(array_diff(array_keys($payload), ['qa_ids']));
        if ($unknown !== []) {
            throw ApiException::badRequest(
                '1:1문의 일괄 삭제 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown)
            );
        }
        if (!isset($payload['qa_ids']) || !is_array($payload['qa_ids'])) {
            throw ApiException::badRequest('qa_ids는 정수 배열이어야 합니다.');
        }

        $qaIds = [];
        foreach ($payload['qa_ids'] as $qaId) {
            if (!is_int($qaId) || $qaId <= 0) {
                throw ApiException::badRequest('qa_ids에는 1 이상의 정수만 사용할 수 있습니다.');
            }
            $qaIds[] = $qaId;
        }

        $result = $this->qaService->bulkDelete($member, $qaIds);
        return ApiResponse::envelope($response, $result);
    }

    public function download(Request $request, Response $response, array $args): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $qaId = $this->toPositiveInt($args['qa_id'] ?? '0', 'qa_id');
        $fileNo = $this->toPositiveInt($args['no'] ?? '0', 'no');

        $file = $this->qaService->getDownloadPayload($qaId, $fileNo, $member);

        $path = (string)($file['path'] ?? '');
        $resource = fopen($path, 'rb');
        if ($resource === false) {
            throw ApiException::serverError('다운로드 파일을 열 수 없습니다.');
        }

        $stream = new Stream($resource);
        $filename = (string)($file['qa_source'] ?? $file['qa_file'] ?? ('qa-' . $qaId . '-file' . $fileNo));
        $quotedName = str_replace('"', '\\"', $filename);
        $encodedName = rawurlencode($filename);
        $disposition = "attachment; filename=\"{$quotedName}\"; filename*=UTF-8''{$encodedName}";

        return $response
            ->withHeader('Content-Type', (string)($file['mime'] ?? 'application/octet-stream'))
            ->withHeader('Content-Length', (string)((int)($file['size'] ?? 0)))
            ->withHeader('Content-Disposition', $disposition)
            ->withHeader('Content-Transfer-Encoding', 'binary')
            ->withHeader('Pragma', 'no-cache')
            ->withHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
            ->withBody($stream)
            ->withStatus(200);
    }

    /**
     * @return array<string, mixed>
     */
    private function parsePayload(Request $request): array
    {
        $contentType = strtolower(trim(explode(';', $request->getHeaderLine('Content-Type'))[0] ?? ''));
        if ($contentType === 'application/json') {
            return ApiResponse::parseJsonBody($request);
        }

        $parsed = $request->getParsedBody();
        return is_array($parsed) ? $parsed : [];
    }

    /**
     * @return array<int|string, UploadedFileInterface>
     */
    private function extractQaFiles(Request $request): array
    {
        $uploadedFiles = $request->getUploadedFiles();
        $candidate = $uploadedFiles['bf_file'] ?? null;
        if ($candidate instanceof UploadedFileInterface) {
            return [1 => $candidate];
        }
        if (!is_array($candidate)) {
            return [];
        }

        $normalized = [];
        foreach ($candidate as $key => $uploadedFile) {
            if (!$uploadedFile instanceof UploadedFileInterface) {
                continue;
            }

            if (is_int($key) || ctype_digit((string)$key)) {
                $normalized[(int)$key] = $uploadedFile;
            } else {
                $normalized[] = $uploadedFile;
            }
        }

        return $normalized;
    }

    private function resolveClientIp(Request $request): string
    {
        $ip = trim((string)$request->getAttribute('client_ip', ''));
        if ($ip !== '') {
            return $ip;
        }

        $server = $request->getServerParams();
        return trim((string)($server['REMOTE_ADDR'] ?? ''));
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
