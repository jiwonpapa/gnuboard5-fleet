<?php

declare(strict_types=1);

namespace Api\Admin\Dev\Support;

final class LegacyAdminMenuCatalog
{
    public function __construct(
        private readonly ?string $projectRoot = null,
    ) {
    }

    /**
     * @return list<array{
     *   menu_group: string,
     *   menu_code: string,
     *   label: string,
     *   slug: string,
     *   path: string,
     *   hidden: bool,
     *   source_file: string
     * }>
     */
    public function listEntries(bool $includeShop = false): array
    {
        $menuFiles = glob($this->resolveProjectRoot() . '/adm/admin.menu*.php') ?: [];
        sort($menuFiles);

        $entries = [];
        foreach ($menuFiles as $menuFile) {
            foreach ($this->parseMenuFile($menuFile) as $entry) {
                if (!$includeShop && str_contains($entry['path'], '/shop_admin/')) {
                    continue;
                }
                $entries[] = $entry;
            }
        }

        usort(
            $entries,
            static fn (array $left, array $right): int => strcmp($left['menu_code'], $right['menu_code'])
        );

        return $entries;
    }

    /**
     * @return list<array{
     *   menu_group: string,
     *   menu_code: string,
     *   label: string,
     *   slug: string,
     *   path: string,
     *   hidden: bool,
     *   source_file: string
     * }>
     */
    private function parseMenuFile(string $path): array
    {
        $content = file_get_contents($path);
        if ($content === false) {
            return [];
        }

        $menuGroup = preg_match('/admin\.menu(\d+)\.php$/', $path, $groupMatch) === 1
            ? $groupMatch[1]
            : '000';

        $entries = [];
        foreach (preg_split('/\R/', $content) ?: [] as $line) {
            if (!str_contains($line, 'array(')) {
                continue;
            }

            if (!preg_match(
                "~array\\(\\s*'(?P<code>\\d+)'\\s*,\\s*'(?P<label>(?:\\\\'|[^'])*)'\\s*,\\s*(?P<path_expr>.+?)\\s*,\\s*'(?P<slug>(?:\\\\'|[^'])*)'(?:\\s*,\\s*(?P<hidden>\\d+))?\\s*\\)~",
                $line,
                $matches
            )) {
                continue;
            }

            $resolvedPath = $this->extractPhpPath($matches['path_expr']);
            if ($resolvedPath === '') {
                continue;
            }

            $entries[] = [
                'menu_group' => $menuGroup,
                'menu_code' => $matches['code'],
                'label' => stripcslashes($matches['label']),
                'slug' => stripcslashes($matches['slug']),
                'path' => $resolvedPath,
                'hidden' => ($matches['hidden'] ?? '') === '1',
                'source_file' => $path,
            ];
        }

        return $entries;
    }

    private function extractPhpPath(string $expression): string
    {
        if (preg_match("~'(?P<path>/[^']+\\.php)'~", $expression, $matches) !== 1) {
            return '';
        }

        $path = $matches['path'];
        if (!str_starts_with($path, '/adm/')) {
            $path = '/adm' . $path;
        }

        return $path;
    }

    private function resolveProjectRoot(): string
    {
        if (is_string($this->projectRoot) && $this->projectRoot !== '') {
            return rtrim($this->projectRoot, '/');
        }

        return dirname(__DIR__, 5);
    }
}
