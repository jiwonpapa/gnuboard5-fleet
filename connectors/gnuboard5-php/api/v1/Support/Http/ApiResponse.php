<?php

/**
 * ApiResponse API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Support\Http
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Support\Http;

use Api\Support\Exception\ApiException;
use DateTimeImmutable;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class ApiResponse
{
    private const API_VERSION = 'v1.0.0';

    public static function envelope(Response $response, array $data, ?array $pagination = null, array $meta = [], ?int $status = null): Response
    {
        $payload = [
            'data' => $data,
            'meta' => self::meta($meta),
        ];

        if ($pagination !== null) {
            $payload['pagination'] = $pagination;
        }

        return self::json($response, $payload, $status);
    }

    public static function problem(Response $response, ApiException $exception, string $instance = ''): Response
    {
        $payload = [
            'type' => $exception->type->value,
            'status' => $exception->statusCode,
            'title' => $exception->title,
            'detail' => $exception->getMessage(),
            'meta' => self::meta(),
        ];

        if ($instance !== '') {
            $payload['instance'] = $instance;
        }

        return self::json($response, $payload, $exception->statusCode);
    }

    public static function parseJsonBody(Request $request): array
    {
        $raw = (string)$request->getBody();
        if (trim($raw) === '') {
            return [];
        }

        $json = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($json)) {
            throw ApiException::badRequest('요청 본문은 JSON 형식이어야 합니다.');
        }

        return $json;
    }

    public static function json(Response $response, array $payload, ?int $status = null): Response
    {
        $response->getBody()->write((string)json_encode($payload, JSON_UNESCAPED_UNICODE));
        $resolvedStatus = $status ?? $response->getStatusCode();

        return $response
            ->withHeader('Content-Type', 'application/json; charset=utf-8')
            ->withStatus($resolvedStatus);
    }

    /**
     * @return array<string, mixed>
     */
    public static function meta(array $meta = []): array
    {
        $defaults = [
            'server_time' => (new DateTimeImmutable())->format(DATE_ATOM),
            'version' => self::API_VERSION,
        ];

        return array_merge($defaults, $meta);
    }
}
