#!/usr/bin/env php
<?php

declare(strict_types=1);

use Api\Admin\Dev\Support\LegacyAdminFieldInventoryExtractor;
use Api\Admin\Dev\Support\LegacyAdminMenuCatalog;

require __DIR__ . '/../vendor/autoload.php';

$options = getopt(
    '',
    [
        'base-url:',
        'output-dir::',
        'target::',
        'menu-group::',
        'inspect-secret::',
        'include-shop',
    ]
);

$baseUrl = rtrim((string)($options['base-url'] ?? ''), '/');
if ($baseUrl === '') {
    fwrite(STDERR, "--base-url 이 필요합니다. 예: --base-url=http://127.0.0.1:8000\n");
    exit(1);
}

$outputDir = (string)($options['output-dir'] ?? (__DIR__ . '/../output/legacy-admin-survey'));
$targets = array_values(
    array_filter(
        array_map(
            'strval',
            is_array($options['target'] ?? null)
                ? $options['target']
                : (isset($options['target']) ? [$options['target']] : [])
        ),
        static fn (string $value): bool => $value !== ''
    )
);
$selectedMenuGroup = trim((string)($options['menu-group'] ?? ''));
$includeShop = array_key_exists('include-shop', $options);

$catalog = new LegacyAdminMenuCatalog(dirname(__DIR__));
$entries = $catalog->listEntries($includeShop);

if ($selectedMenuGroup !== '') {
    $entries = array_values(
        array_filter(
            $entries,
            static fn (array $entry): bool => $entry['menu_group'] === $selectedMenuGroup
        )
    );
}

if ($targets !== []) {
    $entriesByPath = [];
    foreach ($entries as $entry) {
        $entriesByPath[(string)$entry['path']] = $entry;
    }

    $directEntries = [];
    foreach ($targets as $target) {
        $normalizedTarget = normalizeTargetPath($target);
        if (isset($entriesByPath[$normalizedTarget])) {
            $directEntries[] = $entriesByPath[$normalizedTarget];
            continue;
        }

        $slug = trim((string)preg_replace('~[^a-z0-9._-]+~i', '-', ltrim($normalizedTarget, '/')), '-');
        $basename = basename($normalizedTarget, '.php');
        $directEntries[] = [
            'menu_group' => 'direct',
            'menu_code' => 'direct-' . $basename,
            'label' => $basename,
            'slug' => $slug !== '' ? $slug : $basename,
            'path' => $normalizedTarget,
            'hidden' => false,
            'source_file' => '(direct target)',
        ];
    }

    $entries = $directEntries;
}

if ($entries === []) {
    fwrite(STDERR, "조사할 관리자 페이지가 없습니다.\n");
    exit(1);
}

$htmlDir = $outputDir . '/html';
$jsonDir = $outputDir . '/json';
@mkdir($htmlDir, 0775, true);
@mkdir($jsonDir, 0775, true);

$cookieJar = sys_get_temp_dir() . '/g5-admin-survey-cookie-' . bin2hex(random_bytes(4)) . '.txt';
$inspectSecret = trim((string)($options['inspect-secret'] ?? getenv('ADMIN_SCHEMA_INSPECT_SECRET') ?: ''));
$headers = $inspectSecret !== ''
    ? ['X-G5-Admin-Inspect-Secret: ' . $inspectSecret]
    : [];
$bootstrapUrl = $baseUrl . '/dev/local_admin_bootstrap.php?format=json';
$bootstrap = httpRequest($bootstrapUrl, $cookieJar, $headers);
if ($bootstrap['status'] >= 400) {
    fwrite(STDERR, "관리자 세션 부트스트랩 실패: HTTP {$bootstrap['status']}\n{$bootstrap['body']}\n");
    exit(1);
}

$extractor = new LegacyAdminFieldInventoryExtractor();
$manifest = [
    'base_url' => $baseUrl,
    'generated_at' => gmdate(DATE_ATOM),
    'page_count' => count($entries),
    'pages' => [],
];

foreach ($entries as $entry) {
    $path = $entry['path'];
    $page = httpRequest($baseUrl . $path, $cookieJar, $headers);
    if ($page['status'] >= 400) {
        $manifest['pages'][] = [
            ...$entry,
            'status' => $page['status'],
            'error' => trim($page['body']),
        ];
        continue;
    }

    $slug = preg_replace('/[^a-z0-9._-]+/i', '-', $entry['menu_code'] . '-' . $entry['slug']) ?: $entry['menu_code'];
    $htmlPath = $htmlDir . '/' . $slug . '.html';
    $jsonPath = $jsonDir . '/' . $slug . '.json';

    file_put_contents($htmlPath, $page['body']);

    $inventory = $extractor->extract($page['body']);
    $inventory['page'] = [
        'menu_group' => $entry['menu_group'],
        'menu_code' => $entry['menu_code'],
        'label' => $entry['label'],
        'slug' => $entry['slug'],
        'path' => $entry['path'],
        'source_file' => $entry['source_file'],
    ];
    file_put_contents(
        $jsonPath,
        json_encode($inventory, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );

    $manifest['pages'][] = [
        ...$entry,
        'status' => $page['status'],
        'html_path' => $htmlPath,
        'json_path' => $jsonPath,
        'field_count' => $inventory['field_count'],
        'section_count' => $inventory['section_count'],
    ];
}

file_put_contents(
    $outputDir . '/manifest.json',
    json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
);

echo "legacy admin survey written to {$outputDir}\n";

@unlink($cookieJar);

/**
 * @param list<string> $headers
 * @return array{status: int, body: string}
 */
function httpRequest(string $url, string $cookieJar, array $headers = []): array
{
    if (!function_exists('curl_init')) {
        throw new RuntimeException('curl extension 이 필요합니다.');
    }

    $handle = curl_init($url);
    if ($handle === false) {
        throw new RuntimeException('curl 초기화에 실패했습니다.');
    }

    curl_setopt_array(
        $handle,
        [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_COOKIEJAR => $cookieJar,
            CURLOPT_COOKIEFILE => $cookieJar,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HEADER => false,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_HTTPHEADER => $headers,
        ]
    );

    $body = curl_exec($handle);
    $status = (int)curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    if ($body === false) {
        $message = curl_error($handle);
        unset($handle);
        throw new RuntimeException('HTTP 요청 실패: ' . $message);
    }

    unset($handle);

    return [
        'status' => $status,
        'body' => (string)$body,
    ];
}

function normalizeTargetPath(string $target): string
{
    $value = '/' . ltrim(trim($target), '/');
    if (!str_starts_with($value, '/adm/')) {
        return '/adm' . $value;
    }

    return $value;
}
