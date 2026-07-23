#!/usr/bin/env php
<?php

declare(strict_types=1);

use Api\Core\Config\EnvConfig;
use Api\Core\Config\EnvLoader;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\Security\PasswordHashAudit;

require dirname(__DIR__) . '/vendor/autoload.php';

$projectRoot = dirname(__DIR__);
EnvLoader::load(EnvLoader::resolvePath($projectRoot));

$jsonOutput = in_array('--json', $argv, true);

try {
    $config = EnvConfig::fromEnv();
    $queryBuilder = new QueryBuilder();
    $tables = new TableRegistry();
    $memberTable = $tables->get('member');

    $rows = $queryBuilder
        ->executeQuery("SELECT mb_id, mb_password FROM {$memberTable}")
        ->fetchAllAssociative();

    $audit = new PasswordHashAudit();
    $summary = $audit->summarize($rows, $config->encryptFunc);
} catch (Throwable $throwable) {
    fwrite(STDERR, '[password-hash-compat] failed: ' . $throwable->getMessage() . PHP_EOL);
    exit(2);
}

if ($jsonOutput) {
    echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
} else {
    echo '[password-hash-compat] encrypt_func=' . $summary['encrypt_func'] . PHP_EOL;
    echo '[password-hash-compat] total=' . $summary['total']
        . ' compatible=' . $summary['compatible_count']
        . ' incompatible=' . $summary['incompatible_count'] . PHP_EOL;
    echo '[password-hash-compat] formats='
        . json_encode($summary['formats'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;

    if ($summary['incompatible_samples'] !== []) {
        echo '[password-hash-compat] incompatible_samples='
            . json_encode($summary['incompatible_samples'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
            . PHP_EOL;
    }
}

exit($summary['incompatible_count'] === 0 ? 0 : 1);
