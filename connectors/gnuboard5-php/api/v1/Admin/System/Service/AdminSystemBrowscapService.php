<?php

declare(strict_types=1);

namespace Api\Admin\System\Service;

use Api\Admin\System\Repository\AdminSystemMaintenanceRepository;
use Api\Admin\System\Service\Support\AdminSystemMaintenanceContext;
use Api\Support\Exception\ApiException;

final class AdminSystemBrowscapService
{
    public function __construct(
        private readonly AdminSystemMaintenanceRepository $repository,
        private readonly AdminSystemMaintenanceContext $context
    ) {
    }

    /**
     * @return array<string,mixed>
     */
    public function status(): array
    {
        return [
            'available' => $this->isBrowscapAvailable(),
            'plugin_path' => $this->context->browscapPluginPath(),
            'cache_directory' => $this->context->dataPath() . '/cache',
            'cache_file' => $this->context->browscapCacheFile(),
            'cache_exists' => is_file($this->context->browscapCacheFile()),
            'php_version' => PHP_VERSION,
            'pending_visit_count' => $this->repository->countVisitRowsMissingBrowscap(),
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function update(): array
    {
        $this->assertBrowscapAvailable();
        $this->context->ensureDirectory($this->context->dataPath() . '/cache');
        try {
            $browscap = $this->createBrowscap();
            $browscap->updateMethod = 'cURL';
            $browscap->cacheFilename = 'browscap_cache.php';
            $browscap->updateCache();
        } catch (\Throwable $exception) {
            throw ApiException::serverError('Browscap 업데이트에 실패했습니다: ' . $exception->getMessage());
        }

        $status = $this->status();
        $status['updated'] = true;
        $status['cache_mtime'] = is_file($this->context->browscapCacheFile())
            ? date(DATE_ATOM, (int)filemtime($this->context->browscapCacheFile()))
            : null;

        return $status;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function convert(array $payload): array
    {
        if (array_diff(array_keys($payload), ['rows']) !== []) {
            throw ApiException::badRequest('지원하지 않는 Browscap 변환 요청 필드가 포함되어 있습니다.');
        }

        $this->assertBrowscapAvailable();
        if (!is_file($this->context->browscapCacheFile())) {
            throw ApiException::badRequest('Browscap 정보가 없습니다. 먼저 업데이트를 실행해 주세요.');
        }

        $rows = max(1, (int)($payload['rows'] ?? 100));
        $totalBefore = $this->repository->countVisitRowsMissingBrowscap();
        if ($totalBefore === 0) {
            return [
                'rows' => $rows,
                'total_pending_before' => 0,
                'processed_count' => 0,
                'remaining_count' => 0,
                'completed' => true,
            ];
        }

        try {
            $browscap = $this->createBrowscap();
            $browscap->doAutoUpdate = false;
            $browscap->cacheFilename = 'browscap_cache.php';
        } catch (\Throwable $exception) {
            throw ApiException::serverError('Browscap 변환기를 초기화할 수 없습니다: ' . $exception->getMessage());
        }

        $processedCount = 0;
        foreach ($this->repository->listVisitRowsMissingBrowscap($rows) as $row) {
            try {
                $browserInfo = $browscap->getBrowser((string)($row['vi_agent'] ?? ''));
            } catch (\Throwable $exception) {
                throw ApiException::serverError('Browscap 접속로그 변환에 실패했습니다: ' . $exception->getMessage());
            }

            $browser = trim((string)($row['vi_browser'] ?? ''));
            if ($browser === '') {
                $browser = $this->browserProperty($browserInfo, 'Comment');
            }

            $os = trim((string)($row['vi_os'] ?? ''));
            if ($os === '') {
                $os = $this->browserProperty($browserInfo, 'Platform');
            }

            $device = trim((string)($row['vi_device'] ?? ''));
            if ($device === '') {
                $device = $this->browserProperty($browserInfo, 'Device_Type');
            }

            $this->repository->updateVisitBrowscap(
                (int)($row['vi_id'] ?? 0),
                $browser,
                $os,
                $device
            );
            $processedCount++;
        }

        $remainingCount = $this->repository->countVisitRowsMissingBrowscap();

        return [
            'rows' => $rows,
            'total_pending_before' => $totalBefore,
            'processed_count' => $processedCount,
            'remaining_count' => $remainingCount,
            'completed' => $remainingCount === 0,
        ];
    }

    private function assertBrowscapAvailable(): void
    {
        if (!$this->isBrowscapAvailable()) {
            throw ApiException::badRequest('사용할 수 없는 기능입니다.');
        }
    }

    private function isBrowscapAvailable(): bool
    {
        return version_compare(PHP_VERSION, '5.3.0', '>=')
            && is_file($this->context->browscapPluginPath());
    }

    private function createBrowscap(): object
    {
        $pluginPath = $this->context->browscapPluginPath();
        if (!is_file($pluginPath)) {
            throw ApiException::badRequest('Browscap 플러그인을 찾을 수 없습니다.');
        }

        require_once $pluginPath;

        // Stock G5 5.6.x ships the global class; older/custom installations may
        // ship the namespaced variant. Resolve only these known library names.
        foreach ([\Browscap::class, \phpbrowscap\Browscap::class] as $class) {
            if (class_exists($class, false)
                && method_exists($class, 'getBrowser')
                && method_exists($class, 'updateCache')) {
                return new $class($this->context->dataPath() . '/cache');
            }
        }

        throw ApiException::serverError('Browscap 클래스를 로드하지 못했습니다.');
    }

    private function browserProperty(mixed $browserInfo, string $property): string
    {
        if (is_object($browserInfo) && isset($browserInfo->{$property})) {
            return trim((string)$browserInfo->{$property});
        }

        if (is_array($browserInfo) && array_key_exists($property, $browserInfo)) {
            return trim((string)$browserInfo[$property]);
        }

        return '';
    }
}
