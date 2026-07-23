<?php

declare(strict_types=1);

namespace Api\Support\Logging;

use Psr\Http\Message\ServerRequestInterface;
use Throwable;

final class ErrorContextBuilder
{
    /** @var list<string> */
    private const SENSITIVE_KEYS = [
        'authorization',
        'cookie',
        'set-cookie',
        'password',
        'new_password',
        'mb_password',
        'token',
        'access_token',
        'refresh_token',
        'jwt',
        'secret',
        'api_key',
        'db_pass',
    ];

    /**
     * @return array<string, mixed>
     */
    public static function fromRequest(ServerRequestInterface $request, Throwable $exception, bool $includePayload, int $traceLimit): array
    {
        return [
            'request' => [
                'method' => $request->getMethod(),
                'uri' => (string)$request->getUri(),
                'path' => $request->getUri()->getPath(),
                'query' => self::sanitize($request->getQueryParams()),
                'client_ip' => (string)$request->getAttribute('client_ip', ''),
                'user_agent' => $request->getHeaderLine('User-Agent'),
                'content_type' => $request->getHeaderLine('Content-Type'),
                'headers' => self::sanitizeHeaders($request->getHeaders()),
                'payload' => $includePayload ? self::requestPayload($request) : '[disabled]',
            ],
            'auth' => self::authContext($request),
            'exception' => self::exceptionContext($exception, $traceLimit),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function fromServerGlobals(Throwable $exception, string $requestId, bool $includePayload, int $traceLimit): array
    {
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (!is_string($key) || !str_starts_with($key, 'HTTP_')) {
                continue;
            }

            $headerName = str_replace('_', '-', strtolower(substr($key, 5)));
            $headers[$headerName] = [$value];
        }

        return [
            'request_id' => $requestId,
            'request' => [
                'method' => (string)($_SERVER['REQUEST_METHOD'] ?? ''),
                'uri' => (string)($_SERVER['REQUEST_URI'] ?? ''),
                'path' => parse_url((string)($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH) ?: '',
                'query' => self::sanitize($_GET),
                'client_ip' => (string)($_SERVER['REMOTE_ADDR'] ?? ''),
                'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
                'content_type' => (string)($_SERVER['CONTENT_TYPE'] ?? ''),
                'headers' => self::sanitizeHeaders($headers),
                'payload' => $includePayload ? self::bootstrapPayload() : '[disabled]',
            ],
            'exception' => self::exceptionContext($exception, $traceLimit),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function debugPayloadFromRequest(ServerRequestInterface $request, Throwable $exception, bool $includePayload, bool $includeTrace, int $traceLimit): array
    {
        $context = self::fromRequest($request, $exception, $includePayload, $traceLimit);

        if (!$includeTrace && isset($context['exception']['trace'])) {
            unset($context['exception']['trace']);
        }

        return $context;
    }

    /**
     * @return array<string, mixed>
     */
    public static function debugPayloadFromGlobals(Throwable $exception, string $requestId, bool $includePayload, bool $includeTrace, int $traceLimit): array
    {
        $context = self::fromServerGlobals($exception, $requestId, $includePayload, $traceLimit);

        if (!$includeTrace && isset($context['exception']['trace'])) {
            unset($context['exception']['trace']);
        }

        return $context;
    }

    /**
     * @param array<string, array<int, mixed>> $headers
     * @return array<string, mixed>
     */
    private static function sanitizeHeaders(array $headers): array
    {
        $normalized = [];

        foreach ($headers as $name => $values) {
            $lowerName = strtolower((string)$name);
            $normalized[$lowerName] = in_array($lowerName, self::SENSITIVE_KEYS, true)
                ? '***'
                : self::sanitize($values);
        }

        return $normalized;
    }

    /**
     * @return array<string, mixed>|string
     */
    private static function requestPayload(ServerRequestInterface $request): array|string
    {
        $rawBody = $request->getAttribute('raw_body', '');
        if (is_string($rawBody) && trim($rawBody) !== '') {
            $decoded = json_decode($rawBody, true);
            if (is_array($decoded)) {
                return self::sanitize($decoded);
            }

            return '[non-json-body]';
        }

        $parsedBody = $request->getParsedBody();

        return is_array($parsedBody) ? self::sanitize($parsedBody) : '';
    }

    /**
     * @return array<string, mixed>|string
     */
    private static function bootstrapPayload(): array|string
    {
        $rawBody = trim((string)file_get_contents('php://input'));
        if ($rawBody === '') {
            return '';
        }

        $decoded = json_decode($rawBody, true);

        return is_array($decoded) ? self::sanitize($decoded) : '[non-json-body]';
    }

    /**
     * @return array<string, mixed>
     */
    private static function authContext(ServerRequestInterface $request): array
    {
        $member = $request->getAttribute('auth_member', []);
        if (!is_array($member)) {
            return [];
        }

        return [
            'mb_id' => trim((string)($member['mb_id'] ?? '')),
            'mb_level' => isset($member['mb_level']) ? (int)$member['mb_level'] : null,
            'is_admin' => trim((string)($member['is_admin'] ?? '')),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function exceptionContext(Throwable $exception, int $traceLimit): array
    {
        return [
            'type' => $exception::class,
            'message' => $exception->getMessage(),
            'code' => $exception->getCode(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => self::traceFrames($exception, $traceLimit),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function traceFrames(Throwable $exception, int $traceLimit): array
    {
        $frames = [];

        foreach (array_slice($exception->getTrace(), 0, max(1, $traceLimit)) as $frame) {
            $frames[] = [
                'file' => isset($frame['file']) ? (string)$frame['file'] : null,
                'line' => isset($frame['line']) ? (int)$frame['line'] : null,
                'class' => isset($frame['class']) ? (string)$frame['class'] : null,
                'type' => isset($frame['type']) ? (string)$frame['type'] : null,
                'function' => isset($frame['function']) ? (string)$frame['function'] : null,
            ];
        }

        return $frames;
    }

    /**
     * @param mixed $value
     * @return mixed
     */
    private static function sanitize(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }

        $sanitized = [];

        foreach ($value as $key => $item) {
            $lowerKey = strtolower((string)$key);
            if (in_array($lowerKey, self::SENSITIVE_KEYS, true)) {
                $sanitized[$key] = '***';
                continue;
            }

            $sanitized[$key] = is_array($item) ? self::sanitize($item) : $item;
        }

        return $sanitized;
    }
}
