<?php

/**
 * 관리자 메뉴 DB row를 공개 계약 필드와 타입으로 정규화합니다.
 *
 * @package  Gnuboard5\Api\v1\Admin\Menu\Service\Support
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Admin\Menu\Service\Support;

final class AdminMenuPresenter
{
    /**
     * @param array<string, mixed> $menu
     * @return array{me_id:int,me_code:string,me_name:string,me_link:string,me_target:string,me_order:int,me_use:int,me_mobile_use:int}
     */
    public static function menu(array $menu): array
    {
        return [
            'me_id' => (int)($menu['me_id'] ?? 0),
            'me_code' => (string)($menu['me_code'] ?? ''),
            'me_name' => (string)($menu['me_name'] ?? ''),
            'me_link' => (string)($menu['me_link'] ?? ''),
            'me_target' => (string)($menu['me_target'] ?? '_self'),
            'me_order' => (int)($menu['me_order'] ?? 0),
            'me_use' => (int)($menu['me_use'] ?? 0),
            'me_mobile_use' => (int)($menu['me_mobile_use'] ?? 0),
        ];
    }
}
