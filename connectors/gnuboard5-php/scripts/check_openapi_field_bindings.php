<?php

/**
 * 저장된 OpenAPI/runtime graph를 실제 PHP payload field flow와 대조합니다.
 *
 * @package  Gnuboard5\Audit
 * @since    v1.1.0
 */

declare(strict_types=1);

use Gnuboard5\Audit\OpenApiFieldBindingAudit;

ini_set('memory_limit', '512M');

require dirname(__DIR__) . '/vendor/autoload.php';
require __DIR__ . '/lib/Phase1ConsumerScope.php';
require __DIR__ . '/lib/OpenApiFieldBindingAudit.php';

/** @return array<string, string> */
function parseFieldBindingArgs(array $argv): array
{
    $root = dirname(__DIR__);
    $result = [
        'openapi' => $root . '/api/docs/openapi.yaml',
        'runtime-graph' => $root . '/output/openapi-provider-audit/runtime-route-graph.json',
        'policy' => $root . '/api/docs/openapi.field-binding-policy.json',
        'output-json' => $root . '/output/openapi-field-binding/latest.json',
        'output-md' => $root . '/output/openapi-field-binding/latest.md',
    ];
    for ($index = 1; $index < count($argv); $index++) {
        $argument = (string)$argv[$index];
        if (!str_starts_with($argument, '--')) {
            throw new InvalidArgumentException('지원하지 않는 인자입니다: ' . $argument);
        }
        $key = substr($argument, 2);
        if (!array_key_exists($key, $result)) {
            throw new InvalidArgumentException('지원하지 않는 인자입니다: ' . $argument);
        }
        $value = $argv[++$index] ?? '';
        if (!is_string($value) || $value === '') {
            throw new InvalidArgumentException($argument . ' 값이 필요합니다.');
        }
        $result[$key] = $value;
    }
    return $result;
}

/** @param array<string, mixed> $report */
function renderFieldBindingMarkdown(array $report): string
{
    $stats = $report['stats'];
    $lines = [
        '# PHP OpenAPI Field Binding Audit',
        '',
        '- status: `' . $report['status'] . '`',
        '- certified: `' . (($report['certified'] ?? false) ? 'true' : 'false') . '`',
        '- active_operations: `' . $stats['active_operation_count'] . '`',
        '- protected_operations: `' . $stats['protected_operation_count'] . '`',
        '- audited_operations: `' . $stats['audited_operation_count'] . '`',
        '- admin_non_shop_operations: `' . $stats['admin_non_shop_operation_count'] . '`',
        '- bootstrap_operations: `' . $stats['bootstrap_operation_count'] . '`',
        '- passed_operations: `' . $stats['passed_operation_count'] . '`',
        '- failed_operations: `' . $stats['failed_operation_count'] . '`',
        '- findings: `' . $stats['finding_count'] . '`',
        '',
        '## Finding counts',
        '',
    ];
    foreach ($stats['finding_counts'] as $rule => $count) {
        $lines[] = '- `' . $rule . '`: `' . $count . '`';
    }
    $lines[] = '';
    $lines[] = '## Layer reach';
    $lines[] = '';
    foreach ($stats['layer_reach_operation_counts'] as $layer => $count) {
        $lines[] = '- `' . $layer . '`: `' . $count . ' / ' . $stats['audited_operation_count'] . '` operations';
    }
    $lines[] = '';
    $lines[] = '## Failed operations';
    $lines[] = '';
    foreach ($report['operations'] as $operation) {
        if (($operation['status'] ?? null) !== 'failed') {
            continue;
        }
        $lines[] = '- `' . $operation['operation'] . '` `' . ($operation['operation_id'] ?? '')
            . '`: ' . implode(', ', $operation['finding_rules']);
    }
    return rtrim(implode(PHP_EOL, $lines), "\r\n") . PHP_EOL;
}

function writeFieldBindingArtifact(string $path, string $contents): void
{
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0777, true) && !is_dir($directory)) {
        throw new RuntimeException('출력 디렉토리를 만들 수 없습니다: ' . $directory);
    }
    if (file_put_contents($path, $contents) === false) {
        throw new RuntimeException('감사 산출물을 쓸 수 없습니다: ' . $path);
    }
}

/** @param array<string, mixed> $report */
function writeFieldBindingJsonArtifact(string $path, array $report): void
{
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0777, true) && !is_dir($directory)) {
        throw new RuntimeException('출력 디렉토리를 만들 수 없습니다: ' . $directory);
    }
    $stream = fopen($path, 'wb');
    if ($stream === false) {
        throw new RuntimeException('감사 산출물을 열 수 없습니다: ' . $path);
    }
    try {
        fwrite($stream, '{' . PHP_EOL);
        $topLevelKeys = array_keys($report);
        foreach ($topLevelKeys as $topLevelIndex => $key) {
            $encodedKey = json_encode((string)$key, JSON_THROW_ON_ERROR);
            fwrite($stream, '    ' . $encodedKey . ': ');
            if ($key === 'operations' && is_array($report[$key])) {
                fwrite($stream, '[' . PHP_EOL);
                $operations = $report[$key];
                foreach ($operations as $operationIndex => $operation) {
                    $encoded = json_encode(
                        $operation,
                        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
                    );
                    fwrite($stream, '        ' . str_replace(PHP_EOL, PHP_EOL . '        ', $encoded));
                    fwrite($stream, $operationIndex === array_key_last($operations) ? PHP_EOL : ',' . PHP_EOL);
                }
                fwrite($stream, '    ]');
            } else {
                $encoded = json_encode(
                    $report[$key],
                    JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
                );
                fwrite($stream, str_replace(PHP_EOL, PHP_EOL . '    ', $encoded));
            }
            fwrite($stream, $topLevelIndex === array_key_last($topLevelKeys) ? PHP_EOL : ',' . PHP_EOL);
        }
        fwrite($stream, '}' . PHP_EOL);
    } finally {
        fclose($stream);
    }
}

function main(array $argv): int
{
    $args = parseFieldBindingArgs($argv);
    $root = dirname(__DIR__);
    $report = OpenApiFieldBindingAudit::run(
        $root,
        $args['openapi'],
        $args['runtime-graph'],
        $args['policy']
    );
    writeFieldBindingJsonArtifact($args['output-json'], $report);
    writeFieldBindingArtifact($args['output-md'], renderFieldBindingMarkdown($report));

    $stats = $report['stats'];
    echo '[openapi_field_binding]', PHP_EOL;
    echo 'active_operations=', $stats['active_operation_count'], PHP_EOL;
    echo 'protected_operations=', $stats['protected_operation_count'], PHP_EOL;
    echo 'audited_operations=', $stats['audited_operation_count'], PHP_EOL;
    echo 'admin_non_shop_operations=', $stats['admin_non_shop_operation_count'], PHP_EOL;
    echo 'bootstrap_operations=', $stats['bootstrap_operation_count'], PHP_EOL;
    echo 'passed_operations=', $stats['passed_operation_count'], PHP_EOL;
    echo 'failed_operations=', $stats['failed_operation_count'], PHP_EOL;
    echo 'findings=', $stats['finding_count'], PHP_EOL;
    foreach ($stats['finding_counts'] as $rule => $count) {
        echo 'finding.', $rule, '=', $count, PHP_EOL;
    }
    foreach ($stats['layer_reach_operation_counts'] as $layer => $count) {
        echo 'layer.', $layer, '=', $count, PHP_EOL;
    }
    foreach (array_slice($report['findings'], 0, 30) as $finding) {
        echo 'FAIL [', $finding['rule'], '] ', $finding['operation'] ?? ($finding['detail'] ?? ''), PHP_EOL;
    }
    if (($report['status'] ?? null) !== 'passed') {
        echo 'FAIL: PHP OpenAPI field binding is not closed.', PHP_EOL;
        return 1;
    }
    echo 'PASS: PHP OpenAPI field binding', PHP_EOL;
    return 0;
}

try {
    $arguments = array_values(array_map('strval', (array)($GLOBALS['argv'] ?? [])));
    exit(main($arguments));
} catch (Throwable $exception) {
    fwrite(STDERR, 'OpenAPI field binding audit failed: ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
