<?php

/**
 * AdminSystemThemeService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Service;

use Api\Admin\System\Repository\AdminSystemRepository;
use Api\Admin\System\Service\Support\AdminSystemThemeCatalog;
use Api\Core\Enum\MemberLevel;
use Api\Support\Exception\ApiException;

final class AdminSystemThemeService
{
    private ?AdminSystemThemeCatalog $resolvedThemeCatalog = null;

    public function __construct(
        private readonly AdminSystemRepository $repository,
        private readonly ?string $projectRoot = null
    ) {
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function getTheme(array $member): array
    {
        $this->assertSuperAdmin($member);

        $config = $this->repository->getThemeConfig();
        $installedThemes = $this->themeCatalog()->installedThemeIds();
        $currentTheme = trim((string)($config['cf_theme'] ?? ''));
        $currentMobileTheme = trim((string)($config['cf_mobile_theme'] ?? ''));

        return [
            'cf_theme' => $currentTheme,
            'cf_mobile_theme' => $currentMobileTheme,
            'cf_theme_installed' => $currentTheme !== '' && in_array($currentTheme, $installedThemes, true),
            'cf_mobile_theme_installed' => $currentMobileTheme !== '' && in_array($currentMobileTheme, $installedThemes, true),
            'installed_count' => count($installedThemes),
        ];
    }

    /**
     * @param array<string, mixed> $member
     * @return array{items:array<int, array<string, mixed>>, total:int}
     */
    public function listThemes(array $member): array
    {
        $this->assertSuperAdmin($member);

        $config = $this->repository->getThemeConfig();
        $items = [];
        foreach ($this->themeCatalog()->installedThemeIds() as $themeId) {
            $items[] = $this->themeCatalog()->describe($themeId, $config);
        }

        return [
            'items' => $items,
            'total' => count($items),
        ];
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function detailTheme(array $member, string $themeId): array
    {
        $this->assertSuperAdmin($member);

        $normalized = $this->normalizeThemeId($themeId);
        $installedThemes = $this->themeCatalog()->installedThemeIds();
        if (!in_array($normalized, $installedThemes, true)) {
            throw ApiException::notFound('설치된 테마를 찾을 수 없습니다.');
        }

        return $this->themeCatalog()->describe($normalized, $this->repository->getThemeConfig());
    }

    /**
     * @param array<string, mixed> $member
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function updateTheme(array $member, array $payload): array
    {
        $this->assertSuperAdmin($member);

        if (array_diff(array_keys($payload), ['cf_theme', 'cf_mobile_theme']) !== []) {
            throw ApiException::badRequest('지원하지 않는 테마 설정 요청 필드가 포함되어 있습니다.');
        }

        $current = $this->repository->getThemeConfig();
        $installedThemes = $this->themeCatalog()->installedThemeIds();

        $theme = array_key_exists('cf_theme', $payload)
            ? $this->normalizeThemeSelection($payload['cf_theme'] ?? '')
            : trim((string)($current['cf_theme'] ?? ''));
        $mobileTheme = array_key_exists('cf_mobile_theme', $payload)
            ? $this->normalizeThemeSelection($payload['cf_mobile_theme'] ?? '')
            : trim((string)($current['cf_mobile_theme'] ?? ''));

        if (!array_key_exists('cf_theme', $payload) && !array_key_exists('cf_mobile_theme', $payload)) {
            throw ApiException::badRequest('cf_theme 또는 cf_mobile_theme 중 하나는 필요합니다.');
        }

        $this->assertInstalledTheme($theme, $installedThemes, 'cf_theme');
        $this->assertInstalledTheme($mobileTheme, $installedThemes, 'cf_mobile_theme');

        $this->repository->updateThemeConfig($theme, $mobileTheme);

        return $this->getTheme($member);
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

    private function normalizeThemeSelection(mixed $value): string
    {
        $normalized = trim((string)$value);
        if ($normalized === '') {
            return '';
        }

        return $this->normalizeThemeId($normalized);
    }

    private function normalizeThemeId(string $themeId): string
    {
        $normalized = trim($themeId);
        if ($normalized === '' || preg_match('/^[A-Za-z0-9_-]+$/', $normalized) !== 1) {
            throw ApiException::badRequest('theme 형식이 올바르지 않습니다.');
        }

        return $normalized;
    }

    /**
     * @param list<string> $installedThemes
     */
    private function assertInstalledTheme(string $themeId, array $installedThemes, string $field): void
    {
        if ($themeId === '') {
            return;
        }

        if (!in_array($themeId, $installedThemes, true)) {
            throw ApiException::badRequest($field . '에 지정한 테마가 설치되어 있지 않습니다.');
        }
    }

    private function themeCatalog(): AdminSystemThemeCatalog
    {
        return $this->resolvedThemeCatalog ??= new AdminSystemThemeCatalog(
            rtrim($this->projectRoot ?? dirname(__DIR__, 5), '/')
        );
    }
}
