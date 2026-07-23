<?php

declare(strict_types=1);

namespace Api\Support\Http;

use Api\Core\Error\ProblemDetailsHelper;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

final class TraceContext
{
    public const CORRELATION_HEADER = 'X-Correlation-Id';
    public const REQUEST_HEADER = 'X-Request-Id';
    public const SERVER_REQUEST_HEADER = 'X-Server-Request-Id';

    public static function resolveCorrelationId(ServerRequestInterface $request): string
    {
        $attribute = trim((string)$request->getAttribute('correlation_id', ''));
        if ($attribute !== '') {
            return self::normalizeOrGenerate($attribute);
        }

        $legacyAttribute = trim((string)$request->getAttribute('request_id', ''));
        if ($legacyAttribute !== '') {
            return self::normalizeOrGenerate($legacyAttribute);
        }

        $candidate = trim($request->getHeaderLine(self::CORRELATION_HEADER));
        if ($candidate === '') {
            $candidate = trim($request->getHeaderLine(self::REQUEST_HEADER));
        }

        return self::normalizeOrGenerate($candidate);
    }

    public static function resolveServerRequestId(ServerRequestInterface $request): string
    {
        $attribute = trim((string)$request->getAttribute('server_request_id', ''));

        return self::normalizeOrGenerate($attribute);
    }

    public static function resolveCorrelationIdFromGlobals(): string
    {
        $candidate = trim((string)($_SERVER['HTTP_X_CORRELATION_ID'] ?? ''));
        if ($candidate === '') {
            $candidate = trim((string)($_SERVER['HTTP_X_REQUEST_ID'] ?? ''));
        }

        return self::normalizeOrGenerate($candidate);
    }

    public static function generateServerRequestId(): string
    {
        return ProblemDetailsHelper::ensureRequestId('');
    }

    /**
     * @param array<string, mixed> $meta
     * @return array<string, mixed>
     */
    public static function injectMeta(array $meta, ServerRequestInterface $request): array
    {
        $correlationId = self::resolveCorrelationId($request);
        $serverRequestId = self::resolveServerRequestId($request);

        return array_merge($meta, [
            'request_id' => $correlationId,
            'correlation_id' => $correlationId,
            'server_request_id' => $serverRequestId,
        ]);
    }

    public static function applyResponseHeaders(
        ResponseInterface $response,
        ServerRequestInterface $request
    ): ResponseInterface {
        $correlationId = self::resolveCorrelationId($request);
        $serverRequestId = self::resolveServerRequestId($request);

        return $response
            ->withHeader(self::CORRELATION_HEADER, $correlationId)
            ->withHeader(self::REQUEST_HEADER, $correlationId)
            ->withHeader(self::SERVER_REQUEST_HEADER, $serverRequestId);
    }

    public static function durationMs(ServerRequestInterface $request): ?int
    {
        $startedAt = $request->getAttribute('request_started_at');
        if (!is_float($startedAt) && !is_int($startedAt)) {
            return null;
        }

        return max(0, (int)round((microtime(true) - (float)$startedAt) * 1000));
    }

    private static function normalizeOrGenerate(string $value): string
    {
        $normalized = trim($value);
        if ($normalized === '') {
            return ProblemDetailsHelper::ensureRequestId('');
        }

        if (strlen($normalized) > 128) {
            return ProblemDetailsHelper::ensureRequestId('');
        }

        if (preg_match('/^[A-Za-z0-9._:-]+$/', $normalized) !== 1) {
            return ProblemDetailsHelper::ensureRequestId('');
        }

        return $normalized;
    }
}
