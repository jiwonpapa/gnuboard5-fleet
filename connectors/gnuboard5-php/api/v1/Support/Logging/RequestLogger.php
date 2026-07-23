<?php

/**
 * RequestLogger API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Support\Logging
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Support\Logging;

use DateTimeImmutable;
use Psr\Http\Message\ServerRequestInterface;
use Throwable;

final class RequestLogger
{
    /** @var string[] */
    private const SENSITIVE_KEYS = [
        'authorization',
        'password',
        'new_password',
        'mb_password',
        'token',
        'access_token',
        'refresh_token',
        'jwt',
        'secret',
        'api_key',
    ];

    public function __construct(
        private readonly string $logFilePath = __DIR__ . '/../../../logs/error.log'
    ) {
    }

    public function error(ServerRequestInterface $request, Throwable $exception): void
    {
        $requestId = (string)$request->getAttribute('request_id', bin2hex(random_bytes(8)));
        $payload = $this->extractPayload($request);

        $entry = [
            'timestamp' => (new DateTimeImmutable())->format(DATE_ATOM),
            'request_id' => $requestId,
            'method' => $request->getMethod(),
            'uri' => (string)$request->getUri(),
            'ip' => (string)$request->getAttribute('client_ip', ''),
            'request_body' => $payload,
            'exception' => [
                'type' => $exception::class,
                'message' => $exception->getMessage(),
                'code' => $exception->getCode(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTrace(),
            ],
        ];

        $this->append(json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) ?: '{}');
    }

    private function extractPayload(ServerRequestInterface $request): array|string
    {
        $rawBody = $request->getAttribute('raw_body', '');
        if (!is_string($rawBody) || $rawBody === '') {
            return '';
        }

        $decoded = json_decode($rawBody, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
            return '[non-json-body]';
        }

        return self::sanitizePayload($decoded);
    }

    private static function sanitizePayload(array $payload): array
    {
        foreach ($payload as $key => $value) {
            $lowerKey = strtolower((string)$key);
            if (in_array($lowerKey, self::SENSITIVE_KEYS, true)) {
                $payload[$key] = '***';
                continue;
            }

            if (is_array($value)) {
                $payload[$key] = self::sanitizePayload($value);
            }
        }

        return $payload;
    }

    private function append(string $entry): void
    {
        $dir = dirname($this->logFilePath);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        @file_put_contents($this->logFilePath, $entry . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
}
