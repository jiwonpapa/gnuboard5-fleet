<?php

/**
 * 파일 기반 Rate Limit 미들웨어.
 *
 * @package  Api\Core\Middleware
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Middleware;

use Api\Core\Config\EnvValueReader;
use Api\Core\Enum\ApiErrorType;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response;

final class RateLimitMiddleware implements MiddlewareInterface
{
    private const DEFAULT_GUEST_LIMIT_PER_MINUTE = 60;
    private const DEFAULT_AUTH_LIMIT_PER_MINUTE = 120;
    private const DEFAULT_LOGIN_LIMIT = 5;
    private const DEFAULT_LOGIN_WINDOW_SECONDS = 300;

    private readonly string $storagePath;
    private readonly bool $enabled;
    private readonly int $guestLimitPerMinute;
    private readonly int $authLimitPerMinute;
    private readonly int $loginLimit;
    private readonly int $loginWindowSeconds;

    public function __construct(
        ?string $storagePath = null,
        ?bool $enabled = null,
        ?int $guestLimitPerMinute = null,
        ?int $authLimitPerMinute = null,
        ?int $loginLimit = null,
        ?int $loginWindowSeconds = null
    ) {
        $basePath = dirname(__DIR__, 4);
        $configuredStoragePath = EnvValueReader::string('RATE_LIMIT_STORAGE_PATH', '');
        $this->storagePath = $storagePath ?? ($configuredStoragePath !== '' ? $configuredStoragePath : ($basePath . '/sys/tmp/rate_limit'));
        $this->enabled = $enabled ?? $this->resolveEnabled(EnvValueReader::string('RATE_LIMIT_ENABLED', 'true'));
        $this->guestLimitPerMinute = max(1, $guestLimitPerMinute ?? EnvValueReader::int('RATE_LIMIT_PER_MINUTE', self::DEFAULT_GUEST_LIMIT_PER_MINUTE));
        $this->authLimitPerMinute = max(1, $authLimitPerMinute ?? EnvValueReader::int('RATE_LIMIT_AUTH_PER_MINUTE', self::DEFAULT_AUTH_LIMIT_PER_MINUTE));
        $this->loginLimit = max(1, $loginLimit ?? EnvValueReader::int('RATE_LIMIT_LOGIN_PER_WINDOW', self::DEFAULT_LOGIN_LIMIT));
        $this->loginWindowSeconds = max(60, $loginWindowSeconds ?? EnvValueReader::int('RATE_LIMIT_LOGIN_WINDOW_SECONDS', self::DEFAULT_LOGIN_WINDOW_SECONDS));
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if (!$this->enabled) {
            return $handler->handle($request);
        }

        $path = $request->getUri()->getPath();
        $clientIp = $this->resolveClientIp($request);
        $isLoginRoute = $this->isLoginPath($path);
        $isAuthenticated = $this->isAuthenticatedRequest($request);

        $limit = $isLoginRoute
            ? $this->loginLimit
            : ($isAuthenticated ? $this->authLimitPerMinute : $this->guestLimitPerMinute);
        $windowSeconds = $isLoginRoute ? $this->loginWindowSeconds : 60;

        [$count, $resetAt] = $this->incrementAndGetCount($this->buildRateLimitKey($request, $clientIp, $isLoginRoute, $isAuthenticated), $windowSeconds);
        $remaining = max(0, $limit - $count);

        if ($count > $limit) {
            return $this->buildTooManyRequestsResponse($limit, $remaining, $resetAt);
        }

        $response = $handler->handle($request);

        return $response
            ->withHeader('X-RateLimit-Limit', (string)$limit)
            ->withHeader('X-RateLimit-Remaining', (string)$remaining)
            ->withHeader('X-RateLimit-Reset', (string)$resetAt);
    }

    private function resolveEnabled(string $value): bool
    {
        $normalized = strtolower(trim($value));
        return !in_array($normalized, ['0', 'false', 'off', 'no', 'n'], true);
    }

    private function isLoginPath(string $path): bool
    {
        return str_ends_with($path, '/v1/auth/login');
    }

    private function isAuthenticatedRequest(ServerRequestInterface $request): bool
    {
        $authMember = $request->getAttribute('auth_member');
        if (is_array($authMember) && trim((string)($authMember['mb_id'] ?? '')) !== '') {
            return true;
        }

        $authorization = trim($request->getHeaderLine('Authorization'));
        return str_starts_with(strtolower($authorization), 'bearer ');
    }

    private function resolveClientIp(ServerRequestInterface $request): string
    {
        $attributeIp = trim((string)$request->getAttribute('client_ip', ''));
        if ($attributeIp !== '') {
            return $attributeIp;
        }

        $params = $request->getServerParams();
        $remoteAddr = trim((string)($params['REMOTE_ADDR'] ?? ''));
        return $remoteAddr !== '' ? $remoteAddr : 'unknown';
    }

    private function buildRateLimitKey(
        ServerRequestInterface $request,
        string $clientIp,
        bool $isLoginRoute,
        bool $isAuthenticated
    ): string {
        if ($isLoginRoute) {
            return 'login:' . $clientIp;
        }

        if ($isAuthenticated) {
            $authMember = $request->getAttribute('auth_member');
            $memberId = is_array($authMember) ? trim((string)($authMember['mb_id'] ?? '')) : '';
            if ($memberId !== '') {
                return 'member:' . $memberId;
            }

            $authorization = trim($request->getHeaderLine('Authorization'));
            return 'token:' . sha1($authorization);
        }

        return 'ip:' . $clientIp;
    }

    /**
     * @return array{0:int,1:int}
     */
    private function incrementAndGetCount(string $key, int $windowSeconds): array
    {
        $now = time();
        $windowStart = (int)(floor($now / $windowSeconds) * $windowSeconds);
        $resetAt = $windowStart + $windowSeconds;
        $filePath = $this->resolveBucketFilePath($key);

        if (!is_dir($this->storagePath) && !@mkdir($this->storagePath, 0775, true) && !is_dir($this->storagePath)) {
            return [1, $resetAt];
        }

        $handle = @fopen($filePath, 'c+');
        if (!is_resource($handle)) {
            return [1, $resetAt];
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                return [1, $resetAt];
            }

            $raw = stream_get_contents($handle);
            $payload = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
            $storedWindowStart = is_array($payload) ? (int)($payload['window_start'] ?? 0) : 0;
            $count = is_array($payload) ? (int)($payload['count'] ?? 0) : 0;

            if ($storedWindowStart !== $windowStart) {
                $count = 0;
            }

            $count++;

            $encoded = json_encode([
                'window_start' => $windowStart,
                'count' => $count,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            if (is_string($encoded)) {
                ftruncate($handle, 0);
                rewind($handle);
                fwrite($handle, $encoded);
                fflush($handle);
            }

            return [$count, $resetAt];
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    private function resolveBucketFilePath(string $key): string
    {
        return rtrim($this->storagePath, '/') . '/' . sha1($key) . '.json';
    }

    private function buildTooManyRequestsResponse(int $limit, int $remaining, int $resetAt): ResponseInterface
    {
        $response = new Response(429);
        $response = $response
            ->withHeader('Content-Type', 'application/json; charset=utf-8')
            ->withHeader('Retry-After', (string)max(1, $resetAt - time()))
            ->withHeader('X-RateLimit-Limit', (string)$limit)
            ->withHeader('X-RateLimit-Remaining', (string)$remaining)
            ->withHeader('X-RateLimit-Reset', (string)$resetAt);

        $response->getBody()->write((string)json_encode([
            'type' => ApiErrorType::TooManyRequests->value,
            'status' => 429,
            'title' => 'Too Many Requests',
            'detail' => '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
            'error_code' => 'request.rate_limited',
            'error_category' => 'rate_limit',
            'fault_domain' => 'rate_limit',
            'owner' => 'php_api',
            'retryable' => true,
            'user_actionable' => true,
            'meta' => [
                'server_time' => gmdate(DATE_ATOM),
                'version' => '1.0.0',
                'error_code' => 'request.rate_limited',
                'error_category' => 'rate_limit',
                'fault_domain' => 'rate_limit',
                'owner' => 'php_api',
                'retryable' => true,
                'user_actionable' => true,
            ],
            'guide' => [
                'action' => '잠시 후 다시 시도하세요.',
                'reason' => '요청 빈도가 허용 한도를 초과했습니다.',
            ],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return $response;
    }
}
