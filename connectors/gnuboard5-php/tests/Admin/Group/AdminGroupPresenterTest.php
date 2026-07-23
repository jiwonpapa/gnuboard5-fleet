<?php

/**
 * 관리자 게시판 그룹 응답 정규화 회귀를 검증합니다.
 *
 * @package  Tests\Admin\Group
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Tests\Admin\Group;

use Api\Admin\Group\Service\Support\AdminGroupPresenter;
use PHPUnit\Framework\TestCase;

final class AdminGroupPresenterTest extends TestCase
{
    public function testGroupDropsUncontractedSelectStarFieldsAndNormalizesFlag(): void
    {
        self::assertSame([
            'gr_id' => 'community',
            'gr_subject' => '커뮤니티',
            'gr_admin' => 'neo',
            'gr_device' => 'mobile',
            'gr_use_access' => 1,
        ], AdminGroupPresenter::group([
            'gr_id' => 'community',
            'gr_subject' => '커뮤니티',
            'gr_admin' => 'neo',
            'gr_device' => 'mobile',
            'gr_use_access' => '1',
            'gr_order' => '99',
        ]));
    }

    public function testMemberNormalizesJoinScalarsAndPreservesNulls(): void
    {
        $member = AdminGroupPresenter::member([
            'gm_id' => '3',
            'gr_id' => 'community',
            'mb_id' => 'member1',
            'gm_datetime' => '2026-07-15 12:00:00',
            'mb_name' => null,
            'mb_nick' => '네오',
            'mb_level' => '4',
            'mb_today_login' => null,
        ]);

        self::assertSame(3, $member['gm_id']);
        self::assertNull($member['mb_name']);
        self::assertSame(4, $member['mb_level']);
        self::assertNull($member['mb_today_login']);
    }
}
