<?php

/**
 * TableRegistry API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Database
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Core\Database;

use Api\Core\Config\EnvValueReader;
use Api\Core\Exception\ValidationException;

final class TableRegistry
{
    private string $prefix;

    /** @var array<string, string> */
    private array $tableMap = [
        'auth' => 'auth',
        'member' => 'member',
        'board' => 'board',
        'board_new' => 'board_new',
        'board_file' => 'board_file',
        'board_good' => 'board_good',
        'point' => 'point',
        'config' => 'config',
        'menu' => 'menu',
        'group' => 'group',
        'group_member' => 'group_member',
        'content' => 'content',
        'faq' => 'faq',
        'faq_master' => 'faq_master',
        'visit' => 'visit',
        'visit_sum' => 'visit_sum',
        'popular' => 'popular',
        'push_device' => 'push_device',
        'push_log' => 'push_log',
        'push_setting' => 'push_setting',
        'sdui_layout' => 'sdui_layout',
        'sdui_ad' => 'sdui_ad',
        'report' => 'report',
        'user_block' => 'user_block',
        'mail' => 'mail',
        'poll' => 'poll',
        'poll_etc' => 'poll_etc',
        'scrap' => 'scrap',
        'memo' => 'memo',
        'new' => 'new',
        'new_win' => 'new_win',
        'qa_config' => 'qa_config',
        'qa_content' => 'qa_content',
        'api_login_attempt' => 'api_login_attempt',
        'api_token_blacklist' => 'api_token_blacklist',
        'api_external_auth_link' => 'api_external_auth_link',
    ];

    public function __construct(?string $prefix = null)
    {
        $rawPrefix = $prefix ?? EnvValueReader::string('DB_TABLE_PREFIX', 'g5_');
        $normalizedPrefix = preg_replace('/[^a-zA-Z0-9_]/', '', $rawPrefix) ?? '';
        $this->prefix = $normalizedPrefix !== '' ? $normalizedPrefix : 'g5_';
    }

    public function get(string $name): string
    {
        $key = strtolower(trim($name));
        if (!array_key_exists($key, $this->tableMap)) {
            throw new ValidationException('지원하지 않는 테이블명입니다: ' . $name);
        }

        return $this->prefix . $this->tableMap[$key];
    }

    public function writeTable(string $boTable): string
    {
        $normalized = trim($boTable);
        if ($normalized === '' || preg_match('/^[a-zA-Z0-9_]{1,20}$/', $normalized) !== 1) {
            throw new ValidationException('bo_table 형식이 올바르지 않습니다.');
        }

        return $this->prefix . 'write_' . $normalized;
    }

    public function prefix(): string
    {
        return $this->prefix;
    }
}
