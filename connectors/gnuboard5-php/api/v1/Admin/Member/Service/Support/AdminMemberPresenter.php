<?php

/**
 * 관리자 회원 응답을 공개 계약 필드로 정규화합니다.
 *
 * @package  Gnuboard5\Api\v1\Admin\Member\Service\Support
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Admin\Member\Service\Support;

final class AdminMemberPresenter
{
    /**
     * @param array<string, mixed> $member
     * @return array<string, int|string>
     */
    public static function member(array $member): array
    {
        $zip1 = self::zipSegment($member['mb_zip1'] ?? '');
        $zip2 = self::zipSegment($member['mb_zip2'] ?? '');

        return [
            'mb_no' => (int)($member['mb_no'] ?? 0),
            'mb_id' => (string)($member['mb_id'] ?? ''),
            'mb_name' => (string)($member['mb_name'] ?? ''),
            'mb_nick' => (string)($member['mb_nick'] ?? ''),
            'mb_nick_date' => (string)($member['mb_nick_date'] ?? ''),
            'mb_email' => (string)($member['mb_email'] ?? ''),
            'mb_homepage' => (string)($member['mb_homepage'] ?? ''),
            'mb_level' => (int)($member['mb_level'] ?? 0),
            'mb_sex' => (string)($member['mb_sex'] ?? ''),
            'mb_birth' => (string)($member['mb_birth'] ?? ''),
            'mb_tel' => (string)($member['mb_tel'] ?? ''),
            'mb_hp' => (string)($member['mb_hp'] ?? ''),
            'mb_certify' => (string)($member['mb_certify'] ?? ''),
            'mb_adult' => (int)($member['mb_adult'] ?? 0),
            'mb_zip' => $zip1 . $zip2,
            'mb_zip1' => $zip1,
            'mb_zip2' => $zip2,
            'mb_addr1' => (string)($member['mb_addr1'] ?? ''),
            'mb_addr2' => (string)($member['mb_addr2'] ?? ''),
            'mb_addr3' => (string)($member['mb_addr3'] ?? ''),
            'mb_addr_jibeon' => (string)($member['mb_addr_jibeon'] ?? ''),
            'mb_signature' => (string)($member['mb_signature'] ?? ''),
            'mb_recommend' => (string)($member['mb_recommend'] ?? ''),
            'mb_point' => (int)($member['mb_point'] ?? 0),
            'mb_today_login' => (string)($member['mb_today_login'] ?? ''),
            'mb_login_ip' => (string)($member['mb_login_ip'] ?? ''),
            'mb_datetime' => (string)($member['mb_datetime'] ?? ''),
            'mb_ip' => (string)($member['mb_ip'] ?? ''),
            'mb_leave_date' => (string)($member['mb_leave_date'] ?? ''),
            'mb_intercept_date' => (string)($member['mb_intercept_date'] ?? ''),
            'mb_email_certify' => (string)($member['mb_email_certify'] ?? ''),
            'mb_memo' => (string)($member['mb_memo'] ?? ''),
            'mb_mailling' => (int)($member['mb_mailling'] ?? 0),
            'mb_mailling_date' => (string)($member['mb_mailling_date'] ?? ''),
            'mb_sms' => (int)($member['mb_sms'] ?? 0),
            'mb_sms_date' => (string)($member['mb_sms_date'] ?? ''),
            'mb_open' => (int)($member['mb_open'] ?? 0),
            'mb_open_date' => (string)($member['mb_open_date'] ?? ''),
            'mb_profile' => (string)($member['mb_profile'] ?? ''),
            'mb_memo_call' => (string)($member['mb_memo_call'] ?? ''),
            'mb_memo_cnt' => (int)($member['mb_memo_cnt'] ?? 0),
            'mb_scrap_cnt' => (int)($member['mb_scrap_cnt'] ?? 0),
            'mb_marketing_agree' => (int)($member['mb_marketing_agree'] ?? 0),
            'mb_marketing_date' => (string)($member['mb_marketing_date'] ?? ''),
            'mb_thirdparty_agree' => (int)($member['mb_thirdparty_agree'] ?? 0),
            'mb_thirdparty_date' => (string)($member['mb_thirdparty_date'] ?? ''),
            'mb_agree_log' => (string)($member['mb_agree_log'] ?? ''),
            'mb_1' => (string)($member['mb_1'] ?? ''),
            'mb_2' => (string)($member['mb_2'] ?? ''),
            'mb_3' => (string)($member['mb_3'] ?? ''),
            'mb_4' => (string)($member['mb_4'] ?? ''),
            'mb_5' => (string)($member['mb_5'] ?? ''),
            'mb_6' => (string)($member['mb_6'] ?? ''),
            'mb_7' => (string)($member['mb_7'] ?? ''),
            'mb_8' => (string)($member['mb_8'] ?? ''),
            'mb_9' => (string)($member['mb_9'] ?? ''),
            'mb_10' => (string)($member['mb_10'] ?? ''),
        ];
    }

    private static function zipSegment(mixed $value): string
    {
        $digits = preg_replace('/[^0-9]/', '', (string)$value) ?? '';

        return substr($digits, 0, 3);
    }
}
