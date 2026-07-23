<?php

declare(strict_types=1);

namespace Api\Admin\System\Service;

use Api\Admin\System\Service\Support\AdminSystemMaintenanceContext;
use Api\Admin\System\Service\Support\AdminSystemMaintenanceResultBuilder;

final class AdminSystemFileMaintenanceService
{
    private ?AdminSystemMaintenanceResultBuilder $resolvedResultBuilder = null;
    private ?AdminSystemCacheMaintenanceService $resolvedCacheService = null;
    private ?AdminSystemStorageMaintenanceService $resolvedStorageService = null;

    public function __construct(
        private readonly AdminSystemMaintenanceContext $context,
        ?AdminSystemMaintenanceResultBuilder $resultBuilder = null,
        ?AdminSystemCacheMaintenanceService $cacheService = null,
        ?AdminSystemStorageMaintenanceService $storageService = null
    ) {
        $this->resolvedResultBuilder = $resultBuilder;
        $this->resolvedCacheService = $cacheService;
        $this->resolvedStorageService = $storageService;
    }

    /**
     * @return array<string,mixed>
     */
    public function purgeSessionFiles(): array
    {
        return $this->cacheService()->purgeSessionFiles();
    }

    /**
     * @return array<string,mixed>
     */
    public function purgeCacheFiles(): array
    {
        return $this->cacheService()->purgeCacheFiles();
    }

    /**
     * @return array<string,mixed>
     */
    public function purgeCaptchaFiles(): array
    {
        return $this->cacheService()->purgeCaptchaFiles();
    }

    /**
     * @return array<string,mixed>
     */
    public function purgeThumbnailFiles(): array
    {
        return $this->storageService()->purgeThumbnailFiles();
    }

    /**
     * @return array<string,mixed>
     */
    public function purgeMemberListFiles(): array
    {
        return $this->storageService()->purgeMemberListFiles();
    }

    private function resultBuilder(): AdminSystemMaintenanceResultBuilder
    {
        return $this->resolvedResultBuilder ??= new AdminSystemMaintenanceResultBuilder();
    }

    private function cacheService(): AdminSystemCacheMaintenanceService
    {
        return $this->resolvedCacheService ??= new AdminSystemCacheMaintenanceService(
            $this->context,
            $this->resultBuilder()
        );
    }

    private function storageService(): AdminSystemStorageMaintenanceService
    {
        return $this->resolvedStorageService ??= new AdminSystemStorageMaintenanceService(
            $this->context,
            $this->resultBuilder()
        );
    }
}
