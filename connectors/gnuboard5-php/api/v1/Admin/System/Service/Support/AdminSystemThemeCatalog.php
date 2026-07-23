<?php

declare(strict_types=1);

namespace Api\Admin\System\Service\Support;

final class AdminSystemThemeCatalog
{
    public function __construct(private readonly string $projectRoot)
    {
    }

    /**
     * @param array<string,mixed> $config
     * @return array<string,mixed>
     */
    public function describe(string $themeId, array $config): array
    {
        $themePath = $this->themeRoot() . '/' . $themeId;
        $screenshotPath = $themePath . '/screenshot.png';
        $readmePath = $themePath . '/readme.txt';
        $themeConfigPath = $themePath . '/theme.config.php';
        $info = $this->readThemeReadme($readmePath);
        $themeConfig = $this->readThemeConfig($themeConfigPath);

        return [
            'id' => $themeId,
            'path' => $themePath,
            'theme_name' => trim((string)($info['theme_name'] ?? $themeId)) ?: $themeId,
            'theme_uri' => trim((string)($info['theme_uri'] ?? '')),
            'maker' => trim((string)($info['maker'] ?? '')),
            'maker_uri' => trim((string)($info['maker_uri'] ?? '')),
            'version' => trim((string)($info['version'] ?? '')),
            'detail' => trim((string)($info['detail'] ?? '')),
            'license' => trim((string)($info['license'] ?? '')),
            'license_uri' => trim((string)($info['license_uri'] ?? '')),
            'readme_path' => is_file($readmePath) ? $readmePath : null,
            'theme_config_path' => is_file($themeConfigPath) ? $themeConfigPath : null,
            'screenshot_path' => $this->resolveScreenshotPath($screenshotPath),
            'set_default_skin' => (bool)($themeConfig['set_default_skin'] ?? false),
            'preview_board_skin' => trim((string)($themeConfig['preview_board_skin'] ?? '')),
            'preview_mobile_board_skin' => trim((string)($themeConfig['preview_mobile_board_skin'] ?? '')),
            'is_active' => trim((string)($config['cf_theme'] ?? '')) === $themeId,
            'is_mobile_active' => trim((string)($config['cf_mobile_theme'] ?? '')) === $themeId,
            'theme_config' => $themeConfig,
        ];
    }

    /**
     * @return list<string>
     */
    public function installedThemeIds(): array
    {
        $themeRoot = $this->themeRoot();
        if (!is_dir($themeRoot)) {
            return [];
        }

        $items = scandir($themeRoot);
        if (!is_array($items)) {
            return [];
        }

        $themes = [];
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            if (preg_match('/^[A-Za-z0-9_-]+$/', $item) !== 1) {
                continue;
            }

            $themePath = $themeRoot . '/' . $item;
            if (!is_dir($themePath)) {
                continue;
            }

            if (
                !is_file($themePath . '/index.php')
                || !is_file($themePath . '/head.php')
                || !is_file($themePath . '/tail.php')
            ) {
                continue;
            }

            $themes[] = $item;
        }

        natcasesort($themes);

        return array_values($themes);
    }

    private function resolveScreenshotPath(string $path): ?string
    {
        if (!is_file($path)) {
            return null;
        }

        $size = @getimagesize($path);
        if (!is_array($size) || $size[2] !== IMAGETYPE_PNG) {
            return null;
        }

        return $path;
    }

    /**
     * @return array<string,string>
     */
    private function readThemeReadme(string $readmePath): array
    {
        if (!is_file($readmePath)) {
            return [];
        }

        $lines = file($readmePath, FILE_IGNORE_NEW_LINES);
        if (!is_array($lines)) {
            return [];
        }

        $map = [
            'Theme Name' => 'theme_name',
            'Theme URI' => 'theme_uri',
            'Maker' => 'maker',
            'Maker URI' => 'maker_uri',
            'Version' => 'version',
            'Detail' => 'detail',
            'License' => 'license',
            'License URI' => 'license_uri',
        ];

        $info = [];
        foreach ($lines as $line) {
            $trimmed = trim((string)$line);
            if ($trimmed === '' || !str_contains($trimmed, ':')) {
                continue;
            }

            [$rawKey, $rawValue] = explode(':', $trimmed, 2);
            $key = trim($rawKey);
            if (!array_key_exists($key, $map)) {
                continue;
            }

            $info[$map[$key]] = trim($rawValue);
        }

        return $info;
    }

    /**
     * @return array<string,mixed>
     */
    private function readThemeConfig(string $themeConfigPath): array
    {
        if (!is_file($themeConfigPath)) {
            return [];
        }

        if (!defined('_GNUBOARD_')) {
            define('_GNUBOARD_', true);
        }

        $loaded = (static function (string $path): array {
            $theme_config = [];
            include $path;

            return is_array($theme_config)
                ? $theme_config
                : [];
        })($themeConfigPath);

        ksort($loaded);

        return $loaded;
    }

    private function themeRoot(): string
    {
        return rtrim($this->projectRoot, '/') . '/theme';
    }
}
