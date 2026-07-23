<?php

declare(strict_types=1);

$modeInput = $argv[1] ?? 'dev';
$normalizedMode = match (strtolower(trim((string)$modeInput))) {
    'dev', 'debug', 'local' => 'dev',
    'prod', 'product', 'production' => 'prod',
    default => null,
};

if ($normalizedMode === null) {
    fwrite(STDERR, "Unsupported build mode: {$modeInput}\n");
    exit(1);
}

$projectRoot = dirname(__DIR__);
$targetDir = $projectRoot . '/build/runtime';
$targetPath = $targetDir . '/runtime.json';

if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
    fwrite(STDERR, "Failed to create build runtime directory: {$targetDir}\n");
    exit(1);
}

$gitCommit = trim((string)shell_exec('git rev-parse --short HEAD 2>/dev/null'));
$payload = [
    'mode' => $normalizedMode,
    'debug' => $normalizedMode === 'dev',
    'built_at' => gmdate(DATE_ATOM),
    'git_commit' => $gitCommit,
    'source' => 'make',
];

$encoded = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
if ($encoded === false) {
    fwrite(STDERR, "Failed to encode runtime metadata\n");
    exit(1);
}

file_put_contents($targetPath, $encoded . PHP_EOL);
fwrite(STDOUT, "Wrote runtime metadata: {$targetPath}\n");
