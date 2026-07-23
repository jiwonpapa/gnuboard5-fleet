<?php

declare(strict_types=1);

namespace Tests\Admin\System;

use Api\Admin\System\Repository\AdminSystemRepository;
use Api\Admin\System\Service\AdminSystemThemeService;
use Api\Support\Exception\ApiException;
use PHPUnit\Framework\TestCase;

final class AdminSystemThemeServiceTest extends TestCase
{
    private array $tempDirectories = [];

    protected function tearDown(): void
    {
        foreach ($this->tempDirectories as $directory) {
            $this->removeDirectory($directory);
        }

        $this->tempDirectories = [];
    }

    public function testListThemesReturnsInstalledThemeMetadata(): void
    {
        $projectRoot = $this->createProjectRoot();
        $repository = $this->createMock(AdminSystemRepository::class);
        $repository->method('getThemeConfig')->willReturn([
            'cf_theme' => 'demo',
            'cf_mobile_theme' => '',
        ]);

        $service = new AdminSystemThemeService($repository, $projectRoot);
        $result = $service->listThemes(['mb_level' => 10]);

        $this->assertSame(1, $result['total']);
        $this->assertSame('demo', $result['items'][0]['id']);
        $this->assertSame('데모', $result['items'][0]['theme_name']);
        $this->assertTrue($result['items'][0]['is_active']);
        $this->assertTrue($result['items'][0]['set_default_skin']);
        $this->assertStringEndsWith('/theme/demo/screenshot.png', (string)$result['items'][0]['screenshot_path']);
    }

    public function testUpdateThemeRejectsUnknownTheme(): void
    {
        $projectRoot = $this->createProjectRoot();
        $repository = $this->createMock(AdminSystemRepository::class);
        $repository->method('getThemeConfig')->willReturn([
            'cf_theme' => '',
            'cf_mobile_theme' => '',
        ]);

        $service = new AdminSystemThemeService($repository, $projectRoot);

        $this->expectException(ApiException::class);
        $this->expectExceptionMessage('cf_theme에 지정한 테마가 설치되어 있지 않습니다.');

        $service->updateTheme(['mb_level' => 10], ['cf_theme' => 'missing']);
    }

    private function createProjectRoot(): string
    {
        $root = sys_get_temp_dir() . '/g5-theme-test-' . uniqid('', true);
        $themeDir = $root . '/theme/demo';
        mkdir($themeDir, 0777, true);
        file_put_contents($themeDir . '/index.php', '<?php');
        file_put_contents($themeDir . '/head.php', '<?php');
        file_put_contents($themeDir . '/tail.php', '<?php');
        file_put_contents(
            $themeDir . '/readme.txt',
            implode("\n", [
                'Theme Name: 데모',
                'Theme URI: https://example.com/demo',
                'Maker: Example',
                'Maker URI: https://example.com',
                'Version: 1.2.3',
                'Detail: 테스트 테마',
                'License: MIT',
                'License URI: https://example.com/license',
            ])
        );
        file_put_contents(
            $themeDir . '/theme.config.php',
            <<<'PHP'
<?php
if (!defined('_GNUBOARD_')) exit;
$theme_config = [
    'set_default_skin' => true,
    'preview_board_skin' => 'basic',
    'preview_mobile_board_skin' => 'mobile-basic',
];
PHP
        );
        file_put_contents(
            $themeDir . '/screenshot.png',
            (string)base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ecAAAAASUVORK5CYII=', true)
        );

        $this->tempDirectories[] = $root;

        return $root;
    }

    private function removeDirectory(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $item) {
            if ($item->isDir()) {
                @rmdir($item->getPathname());
                continue;
            }

            @unlink($item->getPathname());
        }

        @rmdir($path);
    }
}
