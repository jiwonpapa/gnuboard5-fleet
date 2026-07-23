#!/usr/bin/env php
<?php

declare(strict_types=1);

use Api\Admin\Dev\Support\LegacyAdminFieldInventoryExtractor;
use Api\Admin\Dev\Support\LegacyAdminSchemaParityComparator;
use Api\Admin\Dev\Support\LegacyAdminSchemaParitySurfaceMerger;
use Api\Admin\Schema\Repository\AdminSchemaRepository;

require __DIR__ . '/../vendor/autoload.php';

$options = getopt(
    '',
    [
        'domain:',
        'base-url::',
        'html-file::',
        'inventory-json::',
        'target::',
        'inspect-secret::',
        'strict-choice-options',
        'output-json::',
    ]
);

$domain = trim((string)($options['domain'] ?? ''));
if ($domain === '') {
    fwrite(STDERR, "--domain 이 필요합니다.\n");
    exit(1);
}

$domainConfig = loadDomainConfig($domain);
$schema = (new AdminSchemaRepository())->getDomain($domain);
$surfaceMerger = new LegacyAdminSchemaParitySurfaceMerger();
$extractor = new LegacyAdminFieldInventoryExtractor();

$inventoryPaths = normalizeOptionList($options['inventory-json'] ?? null);
$htmlPaths = normalizeOptionList($options['html-file'] ?? null);
$explicitTargets = normalizeOptionList($options['target'] ?? null);
$legacySpecs = resolveLegacyTargetSpecs($domainConfig, $schema, $explicitTargets);

if (($inventoryPaths !== [] ? 1 : 0) + ($htmlPaths !== [] ? 1 : 0) + (isset($options['base-url']) ? 1 : 0) !== 1) {
    fwrite(STDERR, "--inventory-json, --html-file, --base-url 중 정확히 하나만 지정해야 합니다.\n");
    exit(1);
}

$surfaceInputs = [];
if ($inventoryPaths !== []) {
    $surfaceInputs = loadSurfaceInputsFromInventoryJson($inventoryPaths, $legacySpecs);
} elseif ($htmlPaths !== []) {
    $surfaceInputs = loadSurfaceInputsFromHtmlFiles($htmlPaths, $legacySpecs, $extractor);
} elseif (isset($options['base-url'])) {
    $baseUrl = rtrim((string)$options['base-url'], '/');
    if ($baseUrl === '') {
        fwrite(STDERR, "--base-url 값이 비어 있습니다.\n");
        exit(1);
    }

    if ($legacySpecs === []) {
        fwrite(STDERR, "legacy target을 결정할 수 없습니다. --target 을 지정해 주세요.\n");
        exit(1);
    }

    $cookieJar = sys_get_temp_dir() . '/g5-parity-cookie-' . bin2hex(random_bytes(4)) . '.txt';
    try {
        $bootstrapUrl = $baseUrl . '/dev/local_admin_bootstrap.php?format=json&next=' . rawurlencode($legacySpecs[0]['target']);
        $inspectSecret = trim((string)($options['inspect-secret'] ?? getenv('ADMIN_SCHEMA_INSPECT_SECRET') ?: ''));
        $headers = $inspectSecret !== ''
            ? ['X-G5-Admin-Inspect-Secret: ' . $inspectSecret]
            : [];

        $bootstrap = httpRequest($bootstrapUrl, $cookieJar, $headers);
        if ($bootstrap['status'] >= 400) {
            fwrite(STDERR, "관리자 세션 부트스트랩 실패: HTTP {$bootstrap['status']}\n{$bootstrap['body']}\n");
            exit(1);
        }

        foreach ($legacySpecs as $legacySpec) {
            $target = $legacySpec['target'];
            $page = httpRequest($baseUrl . '/' . ltrim($target, '/'), $cookieJar, $headers);
            if ($page['status'] >= 400) {
                fwrite(STDERR, "legacy page fetch 실패: HTTP {$page['status']}\n{$page['body']}\n");
                exit(1);
            }

            $surfaceInputs[] = [
                'legacy_spec' => $legacySpec,
                'inventory' => $extractor->extract($page['body']),
            ];
        }
    } finally {
        @unlink($cookieJar);
    }
} else {
    fwrite(STDERR, "--inventory-json, --html-file, --base-url 중 하나가 필요합니다.\n");
    exit(1);
}

$comparisonInventories = [];
$comparisonSchemas = [];
$legacyTargets = [];
$legacySurfaces = [];
foreach ($surfaceInputs as $surfaceInput) {
    $legacySpec = $surfaceInput['legacy_spec'];
    $scopedSchema = $surfaceMerger->constrainSchema($schema, $domainConfig, $legacySpec);
    $scopedInventory = $surfaceMerger->constrainInventory($surfaceInput['inventory'], $domainConfig, $legacySpec, $scopedSchema);
    $comparisonInventories[] = $scopedInventory;
    $comparisonSchemas[] = $scopedSchema;
    $legacyTargets[] = $legacySpec['target'];
    $legacySurfaces[] = [
        'target' => $legacySpec['target'],
        'path' => $legacySpec['path'],
        'legacy_field_count' => count(is_array($scopedInventory['fields'] ?? null) ? $scopedInventory['fields'] : []),
        'schema_field_count' => countSchemaFields($scopedSchema),
    ];
}

$comparisonInventory = count($comparisonInventories) === 1
    ? $comparisonInventories[0]
    : $surfaceMerger->mergeInventories($comparisonInventories);
$comparisonSchema = count($comparisonSchemas) === 1
    ? $comparisonSchemas[0]
    : $surfaceMerger->mergeSchemas($comparisonSchemas);

$report = (new LegacyAdminSchemaParityComparator())->compare(
    $comparisonInventory,
    $comparisonSchema,
    [
        'strict_choice_options' => array_key_exists('strict-choice-options', $options),
        'source_field_map' => is_array($domainConfig['source_field_map'] ?? null) ? $domainConfig['source_field_map'] : [],
        'ignored_legacy_fields' => array_values(
            array_unique(
                array_merge(
                    ['captcha_key', 'token'],
                    is_array($domainConfig['ignored_legacy_fields'] ?? null)
                        ? array_map('strval', $domainConfig['ignored_legacy_fields'])
                        : []
                )
            )
        ),
        'ignored_render_type_mismatches' => array_values(
            array_filter(
                array_map(
                    'strval',
                    is_array($domainConfig['ignored_render_type_mismatches'] ?? null)
                        ? $domainConfig['ignored_render_type_mismatches']
                        : []
                ),
                static fn (string $value): bool => $value !== ''
            )
        ),
        'ignored_section_mismatches' => array_values(
            array_filter(
                array_map(
                    'strval',
                    is_array($domainConfig['ignored_section_mismatches'] ?? null)
                        ? $domainConfig['ignored_section_mismatches']
                        : []
                ),
                static fn (string $value): bool => $value !== ''
            )
        ),
        'ignored_required_mismatches' => array_values(
            array_filter(
                array_map(
                    'strval',
                    is_array($domainConfig['ignored_required_mismatches'] ?? null)
                        ? $domainConfig['ignored_required_mismatches']
                        : []
                ),
                static fn (string $value): bool => $value !== ''
            )
        ),
        'ignored_readonly_mismatches' => array_values(
            array_filter(
                array_map(
                    'strval',
                    is_array($domainConfig['ignored_readonly_mismatches'] ?? null)
                        ? $domainConfig['ignored_readonly_mismatches']
                        : []
                ),
                static fn (string $value): bool => $value !== ''
            )
        ),
        'ignored_schema_only_fields' => array_values(
            array_filter(
                array_map(
                    'strval',
                    is_array($domainConfig['ignored_schema_only_fields'] ?? null)
                        ? $domainConfig['ignored_schema_only_fields']
                        : []
                ),
                static fn (string $value): bool => $value !== ''
            )
        ),
    ]
);

$report['domain'] = $domain;
$report['legacy_target'] = count($legacyTargets) === 1 ? $legacyTargets[0] : null;
$report['legacy_targets'] = $legacyTargets;
$report['legacy_surface_count'] = count($legacyTargets);
$report['legacy_surfaces'] = $legacySurfaces;

if (isset($options['output-json'])) {
    file_put_contents(
        (string)$options['output-json'],
        json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );
}

echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;

exit($report['status'] === 'pass' ? 0 : 1);

/**
 * @return array<string, mixed>
 */
function loadDomainConfig(string $domain): array
{
    $manifestPath = __DIR__ . '/../api/v1/Admin/Schema/schema-domains.json';
    $content = file_get_contents($manifestPath);
    if ($content === false) {
        throw new RuntimeException('schema-domains.json 을 읽을 수 없습니다.');
    }

    $decoded = json_decode($content, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('schema-domains.json 형식이 올바르지 않습니다.');
    }

    foreach (($decoded['domains'] ?? []) as $item) {
        if (($item['domain'] ?? null) === $domain) {
            return is_array($item) ? $item : [];
        }
    }

    throw new RuntimeException("schema-domains.json 에 domain={$domain} 이 없습니다.");
}

/**
 * @param mixed $raw
 * @return list<string>
 */
function normalizeOptionList(mixed $raw): array
{
    $values = is_array($raw) ? $raw : [$raw];
    return array_values(
        array_filter(
            array_map(static fn (mixed $value): string => trim((string)$value), $values),
            static fn (string $value): bool => $value !== ''
        )
    );
}

/**
 * @param array<string, mixed> $domainConfig
 * @param array<string, mixed> $schema
 * @param list<string> $explicitTargets
 * @return list<array{
 *   target:string,
 *   path:string|null,
 *   mode:string|null,
 *   schema_scope:string|null,
 *   supported_fields:list<string>|null,
 *   default_section:array{key?: string, label?: string}|null
 * }>
 */
function resolveLegacyTargetSpecs(array $domainConfig, array $schema, array $explicitTargets = []): array
{
    $legacyForms = is_array($domainConfig['legacy_forms'] ?? null) ? $domainConfig['legacy_forms'] : [];
    if ($explicitTargets !== []) {
        return array_map(
            static fn (string $explicitTarget): array => resolveExplicitLegacyTargetSpec($legacyForms, $explicitTarget),
            $explicitTargets
        );
    }

    $resolved = [];
    foreach ($legacyForms as $item) {
        if (is_string($item) && trim($item) !== '') {
            $resolved[] = buildLegacyTargetSpec([
                'path' => trim($item),
            ]);
            continue;
        }
        if (is_array($item)) {
            $resolved[] = buildLegacyTargetSpec($item);
        }
    }

    if ($resolved !== []) {
        return $resolved;
    }

    $legacyForm = trim((string)($schema['legacy_form'] ?? ''));
    if ($legacyForm === '') {
        return [];
    }

    return [
        buildLegacyTargetSpec(['path' => $legacyForm]),
    ];
}

/**
 * @param list<mixed> $legacyForms
 * @return array{
 *   target:string,
 *   path:string|null,
 *   mode:string|null,
 *   schema_scope:string|null,
 *   supported_fields:list<string>|null,
 *   default_section:array{key?: string, label?: string}|null
 * }
 */
function resolveExplicitLegacyTargetSpec(array $legacyForms, string $explicitTarget): array
{
    $resolvedExplicit = resolveTargetPlaceholders($explicitTarget);
    foreach ($legacyForms as $item) {
        if (is_string($item) && trim($item) !== '') {
            if (resolveTargetPlaceholders(trim($item)) === $resolvedExplicit) {
                return buildLegacyTargetSpec(['path' => trim($item)]);
            }
            continue;
        }
        if (!is_array($item)) {
            continue;
        }
        $candidateTarget = trim((string)($item['target'] ?? $item['path'] ?? ''));
        if ($candidateTarget === '') {
            continue;
        }
        if (resolveTargetPlaceholders($candidateTarget) === $resolvedExplicit) {
            return buildLegacyTargetSpec($item);
        }
    }

    return [
        'target' => $resolvedExplicit,
        'path' => null,
        'mode' => null,
        'schema_scope' => null,
        'supported_fields' => null,
        'default_section' => null,
    ];
}

/**
 * @param array<string, mixed> $item
 * @return array{
 *   target:string,
 *   path:string|null,
 *   mode:string|null,
 *   schema_scope:string|null,
 *   supported_fields:list<string>|null,
 *   default_section:array{key?: string, label?: string}|null
 * }
 */
function buildLegacyTargetSpec(array $item): array
{
    $target = trim((string)($item['target'] ?? $item['path'] ?? ''));
    $supportedFields = null;
    if (is_array($item['supported_fields'] ?? null)) {
        $supportedFields = array_values(
            array_filter(
                array_map('strval', $item['supported_fields']),
                static fn (string $value): bool => $value !== ''
            )
        );
    }

    return [
        'target' => resolveTargetPlaceholders($target),
        'path' => isset($item['path']) ? trim((string)$item['path']) : null,
        'mode' => isset($item['mode']) ? trim((string)$item['mode']) : null,
        'schema_scope' => isset($item['schema_scope']) ? trim((string)$item['schema_scope']) : null,
        'supported_fields' => $supportedFields,
        'default_section' => is_array($item['default_section'] ?? null) ? $item['default_section'] : null,
    ];
}

function resolveTargetPlaceholders(string $target): string
{
    $bootstrapAdminId = trim((string)(getenv('ADMIN_LEGACY_BOOTSTRAP_MEMBER_ID') ?: ''));
    if ($bootstrapAdminId === '') {
        $bootstrapAdminId = 'neojins';
    }

    return str_replace('{bootstrap_admin_id}', $bootstrapAdminId, $target);
}

/**
 * @param list<string> $inventoryPaths
 * @param list<array{
 *   target:string,
 *   path:string|null,
 *   mode:string|null,
 *   schema_scope:string|null,
 *   supported_fields:list<string>|null,
 *   default_section:array{key?: string, label?: string}|null
 * }> $legacySpecs
 * @return list<array{
 *   legacy_spec: array{
 *     target:string,
 *     path:string|null,
 *     mode:string|null,
 *     schema_scope:string|null,
 *     supported_fields:list<string>|null,
 *     default_section:array{key?: string, label?: string}|null
 *   },
 *   inventory: array<string, mixed>
 * }>
 */
function loadSurfaceInputsFromInventoryJson(array $inventoryPaths, array $legacySpecs): array
{
    if (count($inventoryPaths) !== count($legacySpecs)) {
        throw new RuntimeException('inventory-json 개수와 legacy target 개수가 일치해야 합니다.');
    }

    $surfaceInputs = [];
    foreach ($inventoryPaths as $index => $inventoryPath) {
        $inventoryContent = file_get_contents($inventoryPath);
        if ($inventoryContent === false) {
            throw new RuntimeException("inventory json을 읽을 수 없습니다: {$inventoryPath}");
        }

        $decoded = json_decode($inventoryContent, true);
        if (!is_array($decoded)) {
            throw new RuntimeException("inventory json 형식이 올바르지 않습니다: {$inventoryPath}");
        }

        $surfaceInputs[] = [
            'legacy_spec' => $legacySpecs[$index],
            'inventory' => $decoded,
        ];
    }

    return $surfaceInputs;
}

/**
 * @param list<string> $htmlPaths
 * @param list<array{
 *   target:string,
 *   path:string|null,
 *   mode:string|null,
 *   schema_scope:string|null,
 *   supported_fields:list<string>|null,
 *   default_section:array{key?: string, label?: string}|null
 * }> $legacySpecs
 * @return list<array{
 *   legacy_spec: array{
 *     target:string,
 *     path:string|null,
 *     mode:string|null,
 *     schema_scope:string|null,
 *     supported_fields:list<string>|null,
 *     default_section:array{key?: string, label?: string}|null
 *   },
 *   inventory: array<string, mixed>
 * }>
 */
function loadSurfaceInputsFromHtmlFiles(array $htmlPaths, array $legacySpecs, LegacyAdminFieldInventoryExtractor $extractor): array
{
    if (count($htmlPaths) !== count($legacySpecs)) {
        throw new RuntimeException('html-file 개수와 legacy target 개수가 일치해야 합니다.');
    }

    $surfaceInputs = [];
    foreach ($htmlPaths as $index => $htmlPath) {
        if (!is_file($htmlPath)) {
            throw new RuntimeException("html 파일을 읽을 수 없습니다: {$htmlPath}");
        }

        $html = file_get_contents($htmlPath);
        if ($html === false) {
            throw new RuntimeException("html 파일을 읽을 수 없습니다: {$htmlPath}");
        }

        $surfaceInputs[] = [
            'legacy_spec' => $legacySpecs[$index],
            'inventory' => $extractor->extract($html),
        ];
    }

    return $surfaceInputs;
}

/**
 * @param array<string, mixed> $schema
 */
function countSchemaFields(array $schema): int
{
    $count = 0;
    foreach (($schema['sections'] ?? []) as $section) {
        if (!is_array($section)) {
            continue;
        }
        foreach (($section['fields'] ?? []) as $field) {
            if (is_array($field) && trim((string)($field['name'] ?? '')) !== '') {
                $count++;
            }
        }
    }

    return $count;
}

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
