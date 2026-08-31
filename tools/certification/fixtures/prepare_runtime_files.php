<?php
// Synthetic input data for the real upstream Browscap parser and file purger.
// Run only in the isolated, disposable G5 certification container as www-data.
require '/var/www/html/plugin/browscap/Browscap.php';

$cache = '/var/www/html/data/cache';
$members = '/var/www/html/data/member_list';
foreach ([$cache, $members] as $directory) {
    if (!is_dir($directory) && !mkdir($directory, 0755, true)) {
        throw new RuntimeException('cannot create certification fixture directory');
    }
}
$target = $cache . '/browscap_cache.php';
if (file_exists($target)) {
    throw new RuntimeException('refusing to replace an existing Browscap cache');
}
$values = [
    'source_version' => 'fleet-r36-synthetic-input',
    'cache_version' => \Browscap::CACHE_FILE_VERSION,
    'properties' => ['browser_name', 'browser_name_regex', 'browser_name_pattern', 'Parent', 'Comment', 'Platform', 'Device_Type'],
    'browsers' => ['fleet' => serialize([4 => 'FleetTestBrowser', 5 => 'FixtureOS', 6 => 'Desktop'])],
    'userAgents' => ['fleet' => 'FleetR36Agent'],
    'patterns' => ['FleetR36Agent' => 'fleet'],
];
$content = "<?php\n";
foreach ($values as $name => $value) {
    $content .= '$' . $name . '=' . var_export($value, true) . ";\n";
}
foreach ([
    $target => $content,
    $cache . '/browscap.ini' => "; offline synthetic certification data\n",
    $members . '/fleet-r36-disposable.txt' => "disposable certification fixture\n",
    $members . '/fleet-r36-preserved.log' => "preserve log files\n",
] as $path => $bytes) {
    if (file_put_contents($path, $bytes, LOCK_EX) !== strlen($bytes)) {
        throw new RuntimeException('cannot write certification fixture');
    }
}
$browser = new \Browscap($cache);
$browser->doAutoUpdate = false;
$browser->cacheFilename = 'browscap_cache.php';
$info = $browser->getBrowser('FleetR36Agent');
if ($info->Comment !== 'FleetTestBrowser' || $info->Platform !== 'FixtureOS' || $info->Device_Type !== 'Desktop') {
    throw new RuntimeException('upstream Browscap fixture readback failed');
}
