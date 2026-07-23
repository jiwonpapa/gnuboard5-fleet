<?php

declare(strict_types=1);

namespace Api\Admin\Schema\Support;

final class AdminSchemaRuntimeDirectoryOptionCatalog
{
    public function __construct(private readonly ?string $projectRoot = null)
    {
    }

    /**
     * @param array<string, mixed> $config
     * @return list<array{value: string, label: string}>
     */
    public function skinOptions(string $skinGroup, bool $mobile, array $config): array
    {
        $skins = [];
        $theme = trim((string)($config['cf_theme'] ?? ''));
        if ($theme !== '') {
            $themeRoot = $mobile
                ? $this->resolveThemeMobileSkinRoot($theme)
                : $this->resolveThemeSkinRoot($theme);

            foreach ($this->listDirectories($themeRoot . '/' . $skinGroup) as $dir) {
                $skins[] = 'theme/' . $dir;
            }
        }

        $baseRoot = $mobile ? $this->resolveMobileSkinRoot() : $this->resolveSkinRoot();
        foreach ($this->listDirectories($baseRoot . '/' . $skinGroup) as $dir) {
            $skins[] = $dir;
        }

        if ($skins === []) {
            return [];
        }

        $options = [['value' => '', 'label' => '선택']];
        foreach ($skins as $skin) {
            if (str_starts_with($skin, 'theme/')) {
                $options[] = [
                    'value' => $skin,
                    'label' => '(테마) ' . substr($skin, 6),
                ];
                continue;
            }

            $options[] = ['value' => $skin, 'label' => $skin];
        }

        return $options;
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public function editorOptions(): array
    {
        $dirs = $this->listDirectories($this->resolveEditorRoot());
        if ($dirs === []) {
            return [];
        }

        $options = [['value' => '', 'label' => '사용안함']];
        foreach ($dirs as $dir) {
            $options[] = ['value' => $dir, 'label' => $dir];
        }

        return $options;
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public function captchaMp3Options(): array
    {
        $dirs = $this->listDirectories($this->resolveCaptchaRoot() . '/mp3');
        if ($dirs === []) {
            return [];
        }

        $options = [['value' => '', 'label' => '선택']];
        foreach ($dirs as $dir) {
            $options[] = ['value' => $dir, 'label' => $dir];
        }

        return $options;
    }

    private function resolveSkinRoot(): string
    {
        if (defined('G5_SKIN_PATH')) {
            return (string)G5_SKIN_PATH;
        }

        return $this->resolveProjectRoot() . '/skin';
    }

    private function resolveMobileSkinRoot(): string
    {
        if (defined('G5_MOBILE_PATH') && defined('G5_SKIN_DIR')) {
            return (string)G5_MOBILE_PATH . '/' . (string)G5_SKIN_DIR;
        }

        return $this->resolveProjectRoot() . '/mobile/skin';
    }

    private function resolveThemeSkinRoot(string $theme): string
    {
        if (defined('G5_THEME_PATH') && defined('G5_SKIN_DIR')) {
            return (string)G5_THEME_PATH . '/' . (string)G5_SKIN_DIR;
        }

        return $this->resolveProjectRoot() . '/theme/' . $theme . '/skin';
    }

    private function resolveThemeMobileSkinRoot(string $theme): string
    {
        if (defined('G5_THEME_MOBILE_PATH') && defined('G5_SKIN_DIR')) {
            return (string)G5_THEME_MOBILE_PATH . '/' . (string)G5_SKIN_DIR;
        }

        return $this->resolveProjectRoot() . '/theme/' . $theme . '/mobile/skin';
    }

    private function resolveEditorRoot(): string
    {
        if (defined('G5_EDITOR_PATH')) {
            return (string)G5_EDITOR_PATH;
        }

        return $this->resolveProjectRoot() . '/plugin/editor';
    }

    private function resolveCaptchaRoot(): string
    {
        if (defined('G5_CAPTCHA_PATH')) {
            return str_replace(['recaptcha_inv', 'recaptcha'], 'kcaptcha', (string)G5_CAPTCHA_PATH);
        }

        return $this->resolveProjectRoot() . '/plugin/kcaptcha';
    }

    private function resolveProjectRoot(): string
    {
        if (is_string($this->projectRoot) && $this->projectRoot !== '') {
            return rtrim($this->projectRoot, '/');
        }

        return dirname(__DIR__, 5);
    }

    /**
     * @return list<string>
     */
    private function listDirectories(string $path): array
    {
        if (!is_dir($path)) {
            return [];
        }

        $items = scandir($path);
        if ($items === false) {
            return [];
        }

        $directories = [];
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            if (!is_dir($path . '/' . $item)) {
                continue;
            }

            $directories[] = $item;
        }

        sort($directories);

        return $directories;
    }
}
