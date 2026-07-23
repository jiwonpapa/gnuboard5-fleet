<?php

/**
 * RequestContextMiddleware API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Middlewares
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Middlewares;

use Api\Core\Config\EnvValueReader;
use Api\Support\Http\TraceContext;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

final class RequestContextMiddleware implements MiddlewareInterface
{
    /** @var array<int, string> */
    private const FORWARDED_HEADERS = ['X-Forwarded-For', 'X-Real-IP', 'Forwarded'];

    public function process(Request $request, RequestHandlerInterface $handler): Response
    {
        $correlationId = TraceContext::resolveCorrelationId($request);
        $serverRequestId = TraceContext::generateServerRequestId();

        $body = $request->getBody();
        $rawBody = '';
        if ($body->isReadable()) {
            $rawBody = (string)$body->getContents();
            if ($body->isSeekable()) {
                $body->rewind();
            }
        }

        $request = $request
            ->withHeader(TraceContext::CORRELATION_HEADER, $correlationId)
            ->withHeader(TraceContext::REQUEST_HEADER, $correlationId)
            ->withHeader(TraceContext::SERVER_REQUEST_HEADER, $serverRequestId)
            ->withAttribute('request_id', $correlationId)
            ->withAttribute('correlation_id', $correlationId)
            ->withAttribute('server_request_id', $serverRequestId)
            ->withAttribute('request_started_at', microtime(true))
            ->withAttribute('raw_body', $rawBody)
            ->withAttribute('client_ip', $this->resolveClientIp($request));

        return $handler->handle($request);
    }

    private function resolveClientIp(Request $request): string
    {
        $remoteAddr = $this->normalizeIp((string)($request->getServerParams()['REMOTE_ADDR'] ?? ''));
        if (!$this->trustProxyHeaders() || !$this->isTrustedProxy($remoteAddr)) {
            return $remoteAddr;
        }

        foreach (self::FORWARDED_HEADERS as $header) {
            $candidate = $this->resolveFromHeader($header, $request->getHeaderLine($header));
            if ($candidate !== '') {
                return $candidate;
            }
        }

        return $remoteAddr;
    }

    private function trustProxyHeaders(): bool
    {
        return EnvValueReader::bool('TRUST_PROXY_HEADERS', false);
    }

    private function isTrustedProxy(string $remoteAddr): bool
    {
        if ($remoteAddr === '') {
            return false;
        }

        $raw = EnvValueReader::string('TRUSTED_PROXIES', '');
        $candidates = array_values(
            array_filter(
                array_map('trim', explode(',', $raw)),
                static fn (string $value): bool => $value !== ''
            )
        );

        if ($candidates === []) {
            return false;
        }
        if (in_array('*', $candidates, true)) {
            return true;
        }

        return in_array($remoteAddr, $candidates, true);
    }
    private function resolveFromHeader(string $header, string $value): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return '';
        }

        if ($header === 'X-Forwarded-For') {
            $parts = array_map('trim', explode(',', $trimmed));
            foreach ($parts as $part) {
                $ip = $this->normalizeIp($part);
                if ($ip !== '') {
                    return $ip;
                }
            }

            return '';
        }

        if ($header === 'Forwarded') {
            if (preg_match('/for=\"?\\[?([^;,\"]+)\\]?\"?/i', $trimmed, $matches) === 1) {
                return $this->normalizeIp((string)$matches[1]);
            }

            return '';
        }

        return $this->normalizeIp($trimmed);
    }

    private function normalizeIp(string $value): string
    {
        $candidate = trim($value);
        if ($candidate === '') {
            return '';
        }

        if (str_starts_with($candidate, '[') && str_ends_with($candidate, ']')) {
            $candidate = trim($candidate, '[]');
        }

        return filter_var($candidate, FILTER_VALIDATE_IP) !== false ? $candidate : '';
    }
}
