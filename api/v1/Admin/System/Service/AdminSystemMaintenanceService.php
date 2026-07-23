<?php

/**
 * AdminSystemMaintenanceService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Service;

use Api\Admin\System\Repository\AdminSystemMaintenanceRepository;
use Api\Admin\System\Service\Support\AdminSystemMaintenanceContext;
use Api\Core\Enum\MemberLevel;
use Api\Support\Exception\ApiException;

final class AdminSystemMaintenanceService
{
    private ?AdminSystemMaintenanceContext $resolvedContext = null;
    private ?AdminSystemFileMaintenanceService $resolvedFileService = null;
    private ?AdminSystemBrowscapService $resolvedBrowscapService = null;

    public function __construct(
        private readonly AdminSystemMaintenanceRepository $repository,
        private readonly ?string $projectRoot = null,
        private readonly ?string $dataPath = null
    ) {
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function phpInfo(array $member): array
    {
        $this->assertAdmin($member);

        ob_start();
        phpinfo();
        $html = (string)ob_get_clean();

        return [
            'php_version' => PHP_VERSION,
            'sapi' => PHP_SAPI,
            'loaded_ini' => php_ini_loaded_file() ?: null,
            'scanned_ini' => php_ini_scanned_files() ?: null,
            'extension_count' => count(get_loaded_extensions()),
            'html' => $html,
        ];
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function purgeSessionFiles(array $member): array
    {
        $this->assertSuperAdmin($member);

        return $this->fileService()->purgeSessionFiles();
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function purgeCacheFiles(array $member): array
    {
        $this->assertSuperAdmin($member);

        return $this->fileService()->purgeCacheFiles();
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function purgeCaptchaFiles(array $member): array
    {
        $this->assertSuperAdmin($member);

        return $this->fileService()->purgeCaptchaFiles();
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function purgeThumbnailFiles(array $member): array
    {
        $this->assertSuperAdmin($member);

        return $this->fileService()->purgeThumbnailFiles();
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function purgeMemberListFiles(array $member): array
    {
        $this->assertSuperAdmin($member);

        return $this->fileService()->purgeMemberListFiles();
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function browscapStatus(array $member): array
    {
        $this->assertSuperAdmin($member);

        return $this->browscapService()->status();
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function updateBrowscap(array $member): array
    {
        $this->assertSuperAdmin($member);

        return $this->browscapService()->update();
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function convertBrowscap(array $member, array $payload): array
    {
        $this->assertSuperAdmin($member);

        return $this->browscapService()->convert($payload);
    }

    /**
     * @param array<string, mixed> $member
     */
    private function assertAdmin(array $member): void
    {
        if (!MemberLevel::fromNumeric((int)($member['mb_level'] ?? 0))->isAdmin()) {
            throw ApiException::forbidden('관리자 권한이 필요합니다.');
        }
    }

    /**
     * @param array<string, mixed> $member
     */
    private function assertSuperAdmin(array $member): void
    {
        if (!MemberLevel::fromNumeric((int)($member['mb_level'] ?? 0))->isAdmin()) {
            throw ApiException::forbidden('최고관리자만 접근할 수 있습니다.');
        }
    }

    private function context(): AdminSystemMaintenanceContext
    {
        return $this->resolvedContext ??= new AdminSystemMaintenanceContext($this->projectRoot, $this->dataPath);
    }

    private function fileService(): AdminSystemFileMaintenanceService
    {
        return $this->resolvedFileService ??= new AdminSystemFileMaintenanceService($this->context());
    }

    private function browscapService(): AdminSystemBrowscapService
    {
        return $this->resolvedBrowscapService ??= new AdminSystemBrowscapService($this->repository, $this->context());
    }
}
