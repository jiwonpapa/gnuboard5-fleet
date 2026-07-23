<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/Support/DbStub.php';

if (!defined('_GNUBOARD_')) {
    define('_GNUBOARD_', true);
}

if (!array_key_exists('DATA_PATH', $_ENV) || trim((string)$_ENV['DATA_PATH']) === '') {
    $defaultDataPath = sys_get_temp_dir() . '/g5-api-test-data';
    if (!is_dir($defaultDataPath)) {
        @mkdir($defaultDataPath, 0775, true);
    }

    $_ENV['DATA_PATH'] = $defaultDataPath;
    putenv('DATA_PATH=' . $defaultDataPath);
}
