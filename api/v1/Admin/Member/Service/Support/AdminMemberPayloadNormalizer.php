<?php

declare(strict_types=1);

namespace Api\Admin\Member\Service\Support;

use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;

final class AdminMemberPayloadNormalizer
{
    /** @var list<string> */
    private const INPUT_FIELDS = [
        'mb_name', 'mb_nick', 'mb_email', 'mb_level', 'mb_hp', 'mb_tel',
        'mb_mailling', 'mb_sms', 'mb_marketing_agree', 'mb_thirdparty_agree',
        'mb_homepage', 'mb_zip', 'mb_zip1', 'mb_zip2', 'mb_addr1', 'mb_addr2',
        'mb_addr3', 'mb_addr_jibeon', 'mb_memo', 'mb_profile', 'mb_signature',
        'mb_adult', 'mb_certify', 'mb_certify_case', 'mb_open', 'mb_leave_date',
        'mb_intercept_date', 'mb_password', 'mb_1', 'mb_2', 'mb_3', 'mb_4',
        'mb_5', 'mb_6', 'mb_7', 'mb_8', 'mb_9', 'mb_10',
    ];

    /** @var list<string> */
    private const STRING_FIELDS = [
        'mb_name', 'mb_nick', 'mb_email', 'mb_hp', 'mb_tel', 'mb_homepage',
        'mb_zip', 'mb_zip1', 'mb_zip2', 'mb_addr1', 'mb_addr2', 'mb_addr3',
        'mb_addr_jibeon', 'mb_memo', 'mb_profile', 'mb_signature', 'mb_certify_case',
        'mb_leave_date', 'mb_intercept_date', 'mb_1', 'mb_2', 'mb_3', 'mb_4',
        'mb_5', 'mb_6', 'mb_7', 'mb_8', 'mb_9', 'mb_10',
    ];

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function normalizeLegacyMemberPayload(array $payload): array
    {
        $unknown = array_values(array_diff(array_keys($payload), self::INPUT_FIELDS));
        if ($unknown !== []) {
            throw ApiException::badRequest('관리자 회원 수정 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown));
        }

        foreach (self::STRING_FIELDS as $field) {
            if (array_key_exists($field, $payload)) {
                $payload[$field] = (string)$payload[$field];
            }
        }

        if (array_key_exists('mb_password', $payload)) {
            $password = trim((string)$payload['mb_password']);
            if ($password === '') {
                unset($payload['mb_password']);
            } else {
                $payload['mb_password'] = $password;
            }
        }

        if (!array_key_exists('mb_certify', $payload) && array_key_exists('mb_certify_case', $payload)) {
            $payload['mb_certify'] = $payload['mb_certify_case'];
        }

        if (array_key_exists('mb_certify', $payload)) {
            $payload['mb_certify'] = $this->normalizeCertifyValue($payload['mb_certify']);
        }

        foreach (['mb_adult', 'mb_open'] as $field) {
            if (array_key_exists($field, $payload)) {
                $payload[$field] = $this->normalizeBoolFlag($payload[$field]);
            }
        }

        foreach (['mb_leave_date', 'mb_intercept_date'] as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }

            $payload[$field] = $this->normalizeOptionalDate($payload[$field]);
        }

        return $payload;
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $existing
     * @return array<string,mixed>
     */
    public function applyConsentAuditFields(array $payload, array $existing): array
    {
        $mapping = [
            'mb_marketing_agree' => ['date_field' => 'mb_marketing_date', 'label' => '마케팅 목적의 개인정보 수집 및 이용'],
            'mb_mailling' => ['date_field' => 'mb_mailling_date', 'label' => '광고성 이메일 수신'],
            'mb_sms' => ['date_field' => 'mb_sms_date', 'label' => '광고성 SMS/카카오톡 수신'],
            'mb_thirdparty_agree' => ['date_field' => 'mb_thirdparty_date', 'label' => '개인정보 제3자 제공'],
            'mb_open' => ['date_field' => 'mb_open_date', 'label' => '정보 공개', 'date_only' => true],
        ];

        $changedItems = [];
        foreach ($mapping as $field => $info) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }

            $nextValue = $this->normalizeBoolFlag($payload[$field]);
            $prevValue = $this->normalizeBoolFlag($existing[$field] ?? '0');
            $payload[$field] = $nextValue;

            if ($nextValue === $prevValue) {
                continue;
            }

            $dateField = (string)$info['date_field'];
            $payload[$dateField] = ($info['date_only'] ?? false) === true
                ? G5DateTime::today()
                : G5DateTime::now();
            $changedItems[] = (string)$info['label'] . '(' . ($nextValue === '1' ? '동의' : '철회') . ')';
        }

        if ($changedItems !== []) {
            $payload['__mb_agree_log_prepend'] = '[' . G5DateTime::now() . ', 관리자 회원수정] ' . implode(' | ', $changedItems) . "\n";
        }

        return $payload;
    }

    public function normalizeBoolFlag(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }
        if (is_int($value) || is_float($value)) {
            $numeric = (int)$value;
            if (!in_array($numeric, [0, 1], true)) {
                throw ApiException::badRequest('동의/상태 필드는 0 또는 1이어야 합니다.');
            }

            return $numeric === 1 ? '1' : '0';
        }

        $normalized = strtolower(trim((string)$value));
        if ($normalized === '' || in_array($normalized, ['0', 'false', 'off', 'no', 'n'], true)) {
            return '0';
        }

        return in_array($normalized, ['1', 'true', 'on', 'yes', 'y'], true) ? '1' : '0';
    }

    private function normalizeCertifyValue(mixed $value): string
    {
        $normalized = trim((string)$value);
        if (!in_array($normalized, ['', 'admin', 'simple', 'hp', 'ipin'], true)) {
            throw ApiException::badRequest('mb_certify 값이 올바르지 않습니다.');
        }

        return $normalized;
    }

    private function normalizeOptionalDate(mixed $value): string
    {
        $normalized = preg_replace('/[^0-9]/', '', trim((string)$value)) ?? '';
        if ($normalized === '') {
            return '';
        }

        if (preg_match('/^\d{8}$/', $normalized) !== 1) {
            throw ApiException::badRequest('날짜 필드는 YYYYMMDD 형식이어야 합니다.');
        }

        return $normalized;
    }
}
