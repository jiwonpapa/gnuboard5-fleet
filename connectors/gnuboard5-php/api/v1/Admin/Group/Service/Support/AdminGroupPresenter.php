<?php

/**
 * AdminGroupPresenter API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Group\Service\Support
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Group\Service\Support;

final class AdminGroupPresenter
{
    /**
     * @param array<string, mixed> $group
     * @return array{gr_id:string, gr_subject:string, gr_admin:string, gr_device:string, gr_use_access:int}
     */
    public static function group(array $group): array
    {
        return [
            'gr_id' => (string)($group['gr_id'] ?? ''),
            'gr_subject' => (string)($group['gr_subject'] ?? ''),
            'gr_admin' => (string)($group['gr_admin'] ?? ''),
            'gr_device' => (string)($group['gr_device'] ?? 'both'),
            'gr_use_access' => (int)($group['gr_use_access'] ?? 0),
        ];
    }

    /**
     * @param array<string, mixed> $member
     * @return array{gm_id:int, gr_id:string, mb_id:string, gm_datetime:string, mb_name:?string, mb_nick:?string, mb_level:?int, mb_today_login:?string}
     */
    public static function member(array $member): array
    {
        return [
            'gm_id' => (int)($member['gm_id'] ?? 0),
            'gr_id' => (string)($member['gr_id'] ?? ''),
            'mb_id' => (string)($member['mb_id'] ?? ''),
            'gm_datetime' => (string)($member['gm_datetime'] ?? ''),
            'mb_name' => self::nullableString($member['mb_name'] ?? null),
            'mb_nick' => self::nullableString($member['mb_nick'] ?? null),
            'mb_level' => isset($member['mb_level']) ? (int)$member['mb_level'] : null,
            'mb_today_login' => self::nullableString($member['mb_today_login'] ?? null),
        ];
    }

    private static function nullableString(mixed $value): ?string
    {
        return $value === null ? null : (string)$value;
    }
}
