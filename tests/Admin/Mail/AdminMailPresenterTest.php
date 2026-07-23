<?php

/**
 * 관리자 메일 응답 정규화 회귀를 검증합니다.
 *
 * @package  Tests\Admin\Mail
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Tests\Admin\Mail;

use Api\Admin\Mail\Service\Support\AdminMailPresenter;
use PHPUnit\Framework\TestCase;

final class AdminMailPresenterTest extends TestCase
{
    public function testTemplateDropsUncontractedFieldsAndNormalizesScalars(): void
    {
        self::assertSame([
            'ma_id' => 7,
            'ma_subject' => '공지',
            'ma_content' => '<p>본문</p>',
            'ma_time' => '2026-07-15 12:30:00',
            'ma_ip' => '127.0.0.1',
            'ma_last_option' => 'mb_mailling=1',
        ], AdminMailPresenter::template([
            'ma_id' => '7',
            'ma_subject' => '공지',
            'ma_content' => '<p>본문</p>',
            'ma_time' => '2026-07-15 12:30:00',
            'ma_ip' => '127.0.0.1',
            'ma_last_option' => 'mb_mailling=1',
            'internal_note' => '응답 제외',
        ]));
    }

    public function testDetailKeepsOnlyContractedExtensionFields(): void
    {
        $lastOption = [
            'mb_id1' => 1,
            'mb_id1_from' => '',
            'mb_id1_to' => '',
            'mb_email' => '',
            'mb_mailling' => 1,
            'mb_level_from' => 1,
            'mb_level_to' => 10,
            'gr_id' => '',
        ];

        $detail = AdminMailPresenter::detail([
            'ma_id' => 3,
            'last_option' => $lastOption,
            'preview_html' => '<html></html>',
            'debug' => true,
        ]);

        self::assertSame($lastOption, $detail['last_option']);
        self::assertSame('<html></html>', $detail['preview_html']);
        self::assertArrayNotHasKey('debug', $detail);
    }

    public function testRecipientReturnsExactSevenFieldDto(): void
    {
        self::assertSame([
            'mb_id' => 'member1',
            'mb_name' => '회원',
            'mb_nick' => '닉',
            'mb_email' => 'member1@example.com',
            'mb_level' => 4,
            'mb_mailling' => 1,
            'mb_datetime' => '2026-07-15 09:00:00',
        ], AdminMailPresenter::recipient([
            'mb_id' => 'member1',
            'mb_name' => '회원',
            'mb_nick' => '닉',
            'mb_email' => 'member1@example.com',
            'mb_level' => '4',
            'mb_mailling' => '1',
            'mb_datetime' => '2026-07-15 09:00:00',
            'mb_password' => 'must-not-leak',
        ]));
    }
}
