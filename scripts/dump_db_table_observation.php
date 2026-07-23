#!/usr/bin/env php
<?php

declare(strict_types=1);

use Api\Admin\Dev\Support\DbTableObservationBuilder;

$options = getopt('', ['table:', 'sample-limit::']);
$table = trim((string)($options['table'] ?? ''));
if ($table === '') {
    fwrite(STDERR, "--table 이 필요합니다.\n");
    exit(1);
}

$sampleLimit = (int)($options['sample-limit'] ?? 1);
if ($sampleLimit < 1) {
    $sampleLimit = 1;
}

$root = dirname(__DIR__);
require_once $root . '/vendor/autoload.php';

$builder = new DbTableObservationBuilder();
$payload = $builder->build($table, $sampleLimit);

echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
