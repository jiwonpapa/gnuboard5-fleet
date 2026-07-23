#!/usr/bin/env php
<?php

declare(strict_types=1);

if ($argc < 3) {
    fwrite(STDERR, "Usage: php scripts/check_service_coverage.php <clover.xml> <min-percent>\n");
    exit(1);
}

$coverageFile = $argv[1];
$minPercent = (float)$argv[2];

if (!is_file($coverageFile)) {
    fwrite(STDERR, "Coverage file not found: {$coverageFile}\n");
    exit(1);
}

$xml = simplexml_load_file($coverageFile);
if ($xml === false) {
    fwrite(STDERR, "Failed to parse coverage XML: {$coverageFile}\n");
    exit(1);
}

$serviceFiles = $xml->xpath('//file') ?: [];
$totalStatements = 0;
$coveredStatements = 0;
$matchedFiles = 0;

foreach ($serviceFiles as $file) {
    $name = (string)($file['name'] ?? '');
    if ($name === '') {
        continue;
    }

    if (!str_contains($name, '/api/v1/') || !str_contains($name, '/Service/')) {
        continue;
    }

    $metrics = $file->metrics[0] ?? null;
    if ($metrics === null) {
        continue;
    }

    $statements = (int)($metrics['statements'] ?? 0);
    $covered = (int)($metrics['coveredstatements'] ?? 0);
    if ($statements === 0) {
        continue;
    }

    $totalStatements += $statements;
    $coveredStatements += $covered;
    $matchedFiles++;
}

if ($matchedFiles === 0 || $totalStatements === 0) {
    fwrite(STDERR, "No service-layer coverage metrics found.\n");
    exit(1);
}

$coverage = ($coveredStatements / $totalStatements) * 100;
printf(
    "Service coverage: %.2f%% (%d/%d statements across %d files)\n",
    $coverage,
    $coveredStatements,
    $totalStatements,
    $matchedFiles
);

if ($coverage + 0.00001 < $minPercent) {
    fwrite(STDERR, sprintf("Service coverage threshold not met: %.2f%% < %.2f%%\n", $coverage, $minPercent));
    exit(1);
}
