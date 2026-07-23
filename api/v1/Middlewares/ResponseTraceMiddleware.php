<?php

declare(strict_types=1);

namespace Api\Middlewares;

use Api\Support\Http\TraceContext;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Stream;

final class ResponseTraceMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly LoggerInterface $logger)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $response = $handler->handle($request);
        [$correlationId, $serverRequestId] = $this->resolveTraceIds($request, $response);
        $response = $response
            ->withHeader(TraceContext::CORRELATION_HEADER, $correlationId)
            ->withHeader(TraceContext::REQUEST_HEADER, $correlationId)
            ->withHeader(TraceContext::SERVER_REQUEST_HEADER, $serverRequestId);
        $response = $this->injectTraceIntoJsonBody($response, $correlationId, $serverRequestId);

        if ($response->getStatusCode() < 400) {
            $this->logger->info('api_request_completed', [
                'request_id' => $correlationId,
                'correlation_id' => $correlationId,
                'server_request_id' => $serverRequestId,
                'method' => $request->getMethod(),
                'path' => $request->getUri()->getPath(),
                'query' => $request->getUri()->getQuery(),
                'status' => $response->getStatusCode(),
                'duration_ms' => TraceContext::durationMs($request),
                'client_ip' => (string)$request->getAttribute('client_ip', ''),
            ]);
        }

        return $response;
    }

    private function injectTraceIntoJsonBody(
        ResponseInterface $response,
        string $correlationId,
        string $serverRequestId
    ): ResponseInterface {
        $contentType = strtolower(trim($response->getHeaderLine('Content-Type')));
        if ($contentType === '' || !str_contains($contentType, 'application/json')) {
            return $response;
        }

        $rawBody = (string)$response->getBody();
        if (trim($rawBody) === '') {
            return $response;
        }

        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            return $response;
        }

        $hasChanges = false;
        if (isset($payload['meta']) && is_array($payload['meta'])) {
            $payload['meta'] = array_merge($payload['meta'], [
                'request_id' => $correlationId,
                'correlation_id' => $correlationId,
                'server_request_id' => $serverRequestId,
            ]);
            $hasChanges = true;
        }

        if ($this->looksLikeProblemDetails($payload)) {
            $payload['request_id'] = $correlationId;
            $payload['correlation_id'] = $correlationId;
            $payload['server_request_id'] = $serverRequestId;
            $hasChanges = true;
        }

        if (!$hasChanges) {
            return $response;
        }

        $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            return $response;
        }

        $stream = fopen('php://temp', 'r+');
        if (!is_resource($stream)) {
            return $response;
        }

        fwrite($stream, $encoded);
        rewind($stream);

        return $response
            ->withBody(new Stream($stream))
            ->withoutHeader('Content-Length')
            ->withHeader('Content-Length', (string)strlen($encoded));
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function looksLikeProblemDetails(array $payload): bool
    {
        return isset($payload['type'], $payload['status'], $payload['title'], $payload['detail']);
    }

    /**
     * @return array{0:string, 1:string}
     */
    private function resolveTraceIds(
        ServerRequestInterface $request,
        ResponseInterface $response
    ): array {
        $correlationId = trim($response->getHeaderLine(TraceContext::CORRELATION_HEADER));
        if ($correlationId === '') {
            $correlationId = trim($response->getHeaderLine(TraceContext::REQUEST_HEADER));
        }
        if ($correlationId === '') {
            $correlationId = TraceContext::resolveCorrelationId($request);
        }

        $serverRequestId = trim($response->getHeaderLine(TraceContext::SERVER_REQUEST_HEADER));
        if ($serverRequestId === '') {
            $serverRequestId = TraceContext::resolveServerRequestId($request);
        }

        return [$correlationId, $serverRequestId];
    }
}
