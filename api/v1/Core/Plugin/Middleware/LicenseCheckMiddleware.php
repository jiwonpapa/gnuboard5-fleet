<?php

/**
 * LicenseCheckMiddleware API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Plugin\Middleware
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Plugin\Middleware;

use Api\Core\Config\EnvValueReader;
use Api\Core\Enum\ApiErrorType;
use Api\Support\Exception\ApiException;
use Closure;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

final class LicenseCheckMiddleware implements MiddlewareInterface
{
    private readonly ?Closure $verifier;
    /** @var array<int, string> */
    private readonly array $protectedPaths;

    public function __construct(
        private readonly string $checkUrl,
        private readonly string $pluginName,
        array $protectedPaths = [],
        ?callable $verifier = null
    ) {
        $this->protectedPaths = $this->normalizeProtectedPaths($protectedPaths);
        $this->verifier = $verifier !== null ? Closure::fromCallable($verifier) : null;
    }

    public function process(Request $request, RequestHandlerInterface $handler): Response
    {
        if (!$this->appliesToRequest($request)) {
            return $handler->handle($request);
        }

        $cacheKey = 'plugin_license_' . $this->pluginName;
        $cached = $this->fetchCachedValidity($cacheKey);
        $valid = $cached ?? $this->verifyLicense($request);

        if ($cached === null) {
            $this->storeCachedValidity($cacheKey, $valid);
        }

        if (!$valid) {
            throw new ApiException(
                402,
                ApiErrorType::Forbidden,
                'License Required',
                "플러그인 '{$this->pluginName}'의 유효한 라이선스가 필요합니다."
            );
        }

        return $handler->handle($request);
    }

    private function appliesToRequest(Request $request): bool
    {
        $path = $this->normalizePath($request->getUri()->getPath());
        $pluginPath = '/v1/p/' . $this->pluginName;

        if (!str_starts_with($path, $pluginPath . '/') && $path !== $pluginPath) {
            return false;
        }

        if ($this->protectedPaths === []) {
            return true;
        }

        $relativePath = substr($path, strlen($pluginPath));
        $relativePath = $relativePath === '' ? '/' : $this->normalizePath($relativePath);

        foreach ($this->protectedPaths as $protectedPath) {
            if ($protectedPath === '/') {
                return true;
            }

            if ($relativePath === $protectedPath || str_starts_with($relativePath, $protectedPath . '/')) {
                return true;
            }
        }

        return false;
    }

    private function fetchCachedValidity(string $cacheKey): ?bool
    {
        if (!function_exists('apcu_fetch')) {
            return null;
        }

        $success = false;
        $cached = apcu_fetch($cacheKey, $success);
        if (!$success || !is_bool($cached)) {
            return null;
        }

        return $cached;
    }

    private function storeCachedValidity(string $cacheKey, bool $valid): void
    {
        if (!function_exists('apcu_store')) {
            return;
        }

        apcu_store($cacheKey, $valid, 86400);
    }

    private function verifyLicense(Request $request): bool
    {
        $licenseKey = EnvValueReader::raw($this->licenseEnvKey());
        if ($licenseKey === '') {
            return false;
        }

        if ($this->verifier instanceof Closure) {
            return (bool)($this->verifier)($licenseKey, $request, $this->checkUrl);
        }

        if (!function_exists('curl_init')) {
            return false;
        }

        $payload = json_encode([
            'license_key' => $licenseKey,
            'domain' => $request->getUri()->getHost(),
        ]);
        if ($payload === false) {
            return false;
        }

        $handle = curl_init($this->checkUrl);
        if ($handle === false) {
            return false;
        }

        curl_setopt_array($handle, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
        ]);

        curl_exec($handle);
        $httpCode = (int)curl_getinfo($handle, CURLINFO_HTTP_CODE);
        curl_close($handle);

        return $httpCode === 200;
    }

    private function licenseEnvKey(): string
    {
        return 'PLUGIN_' . strtoupper(str_replace('-', '_', $this->pluginName)) . '_LICENSE';
    }

    private function normalizePath(string $path): string
    {
        $normalized = '/' . trim($path, '/');
        if ($normalized === '/api') {
            return '/';
        }
        if (str_starts_with($normalized, '/api/')) {
            $normalized = substr($normalized, 4);
        }

        if ($normalized === '') {
            return '/';
        }

        $trimmed = rtrim($normalized, '/');

        return $trimmed === '' ? '/' : $trimmed;
    }

    /**
     * @param array<int, mixed> $protectedPaths
     * @return array<int, string>
     */
    private function normalizeProtectedPaths(array $protectedPaths): array
    {
        $normalized = [];
        foreach ($protectedPaths as $protectedPath) {
            if (!is_string($protectedPath)) {
                continue;
            }

            $trimmed = trim($protectedPath);
            if ($trimmed === '') {
                continue;
            }

            $normalized[] = '/' . trim($trimmed, '/');
        }

        return array_values(array_unique($normalized));
    }
}
