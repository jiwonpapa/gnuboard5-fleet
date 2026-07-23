<?php

/**
 * ConfigRepository API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Config\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Config\Repository;

use Api\Core\Config\G5Config;
use Api\Core\Config\LegacyConfigProvider;
use Throwable;

final class ConfigRepository
{
    private const PUBLIC_KEYS = [
        'cf_title',
        'cf_theme',
        'cf_admin_email',
        'cf_admin_email_name',
        'cf_add_script',
        'cf_use_point',
        'cf_point_term',
        'cf_login_point',
        'cf_write_point',
        'cf_comment_point',
        'cf_download_point',
        'cf_read_point',
        'cf_search_part',
        'cf_register_point',
        'cf_register_level',
        'cf_use_email_certify',
        'cf_nick_modify',
        'cf_recommend_point',
        'cf_use_recommend',
        'cf_bbs_rewrite',
        'cf_link_target',
        'cf_delay_sec',
        'cf_cut_name',
        'cf_stipulation',
        'cf_privacy',
    ];

    public function __construct(
        private readonly ?G5Config $configReader = null,
        private readonly ?LegacyConfigProvider $legacyConfigProvider = null
    ) {
    }

    public function getPublicConfig(): array
    {
        $config = $this->loadConfig();

        if (!is_array($config)) {
            return [];
        }

        $result = [];
        foreach (self::PUBLIC_KEYS as $key) {
            if (array_key_exists($key, $config)) {
                $result[$key] = $config[$key];
            }
        }

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    private function loadConfig(): array
    {
        try {
            if ($this->configReader instanceof G5Config) {
                return $this->configReader->getAll();
            }

            return (new G5Config(
                new \Api\Core\Database\QueryBuilder(),
                new \Api\Core\Database\TableRegistry()
            ))->getAll();
        } catch (Throwable) {
            return $this->legacyConfigProvider()->all();
        }
    }

    private function legacyConfigProvider(): LegacyConfigProvider
    {
        return $this->legacyConfigProvider ?? new LegacyConfigProvider();
    }
}
