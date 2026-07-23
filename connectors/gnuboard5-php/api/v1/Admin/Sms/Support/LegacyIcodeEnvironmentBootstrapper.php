<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Support;

final class LegacyIcodeEnvironmentBootstrapper
{
    private string $projectRoot;

    public function __construct(?string $projectRoot = null)
    {
        $this->projectRoot = $projectRoot ?? dirname(__DIR__, 5);
    }

    /**
     * @param array<string,mixed> $config
     * @return array{had_config: bool, config?: mixed}
     */
    public function boot(array $config): array
    {
        $defaults = $this->legacySmsDefaults();

        if (!defined('_GNUBOARD_')) {
            define('_GNUBOARD_', true);
        }
        if (!defined('G5_LIB_PATH')) {
            define('G5_LIB_PATH', $this->projectRoot . '/lib');
        }
        if (!defined('G5_PLUGIN_PATH')) {
            define('G5_PLUGIN_PATH', $this->projectRoot . '/plugin');
        }
        if (!defined('ICODE_JSON_SOCKET_HOST')) {
            define('ICODE_JSON_SOCKET_HOST', (string)($defaults['icode_json_socket_host'] ?? ''));
        }
        if (!defined('ICODE_JSON_SOCKET_PORT')) {
            define('ICODE_JSON_SOCKET_PORT', (string)($defaults['icode_json_socket_port'] ?? '9201'));
        }
        if (!defined('G5_ICODE_LMS_MAX_LENGTH')) {
            define('G5_ICODE_LMS_MAX_LENGTH', (int)($defaults['icode_lms_max_length'] ?? 1500));
        }
        if (!defined('G5_ICODE_JSON_MAX_LENGTH')) {
            define('G5_ICODE_JSON_MAX_LENGTH', (int)($defaults['icode_json_max_length'] ?? 2000));
        }

        $snapshot = ['had_config' => array_key_exists('config', $GLOBALS)];
        if ($snapshot['had_config']) {
            $snapshot['config'] = $GLOBALS['config'];
        }

        $patch = $this->legacyConfigPatch($config);
        if ($patch !== []) {
            $GLOBALS['config'] = array_merge((array)($GLOBALS['config'] ?? []), $patch);
        }

        return $snapshot;
    }

    /**
     * @param array{had_config: bool, config?: mixed} $snapshot
     */
    public function restore(array $snapshot): void
    {
        if (($snapshot['had_config'] ?? false) === true) {
            $GLOBALS['config'] = $snapshot['config'] ?? [];

            return;
        }

        unset($GLOBALS['config']);
    }

    /**
     * @param array<string,mixed> $config
     */
    public function resolveHost(array $config): string
    {
        $host = trim((string)($config['cf_icode_server_ip'] ?? ''));
        if ($host !== '') {
            return $host;
        }

        return (string)($this->legacySmsDefaults()['icode_json_socket_host'] ?? '');
    }

    public function projectRoot(): string
    {
        return $this->projectRoot;
    }

    /**
     * @return array<string,mixed>
     */
    private function legacySmsDefaults(): array
    {
        static $defaults;

        if (!is_array($defaults)) {
            /** @var array<string,mixed> $loaded */
            $loaded = require $this->projectRoot . '/resources/legacy_sms_defaults.php';
            $defaults = $loaded;
        }

        return $defaults;
    }

    /**
     * @param array<string,mixed> $config
     * @return array<string,string>
     */
    private function legacyConfigPatch(array $config): array
    {
        $tokenKey = (string)($config['cf_icode_token_key'] ?? '');
        if (trim($tokenKey) === '') {
            return [];
        }

        return [
            'cf_icode_token_key' => $tokenKey,
        ];
    }
}
