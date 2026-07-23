<?php

/**
 * 관리자 회원 응답 프로젝션의 공개 필드와 비밀 필드 차단을 검증합니다.
 *
 * @package  Gnuboard5\Tests\Admin\Member
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Tests\Admin\Member;

use Api\Admin\Member\Service\Support\AdminMemberPresenter;
use PHPUnit\Framework\TestCase;

final class AdminMemberPresenterTest extends TestCase
{
    public function testMemberProjectsOnlyTheClosedPublicContract(): void
    {
        $member = AdminMemberPresenter::member([
            'mb_no' => '7',
            'mb_id' => 'neo1',
            'mb_level' => '9',
            'mb_point' => '1200',
            'mb_zip1' => '123-',
            'mb_zip2' => '4567',
            'mb_mailling' => '1',
            'mb_password' => 'sha256:secret-hash',
            'mb_email_certify2' => 'private-token',
            'mb_lost_certify' => 'lost-password-token',
            'mb_dupinfo' => 'identity-secret',
        ]);

        self::assertSame(7, $member['mb_no']);
        self::assertSame(9, $member['mb_level']);
        self::assertSame(1200, $member['mb_point']);
        self::assertSame(1, $member['mb_mailling']);
        self::assertSame('123456', $member['mb_zip']);
        self::assertSame('123', $member['mb_zip1']);
        self::assertSame('456', $member['mb_zip2']);
        self::assertCount(57, $member);

        self::assertArrayNotHasKey('mb_password', $member);
        self::assertArrayNotHasKey('mb_email_certify2', $member);
        self::assertArrayNotHasKey('mb_lost_certify', $member);
        self::assertArrayNotHasKey('mb_dupinfo', $member);
    }
}
