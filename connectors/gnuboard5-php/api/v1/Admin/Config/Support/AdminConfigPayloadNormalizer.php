<?php

declare(strict_types=1);

namespace Api\Admin\Config\Support;

use Api\Admin\Config\Repository\AdminConfigRepository;
use Api\Admin\Config\Repository\AdminConfigUpdateBuilder;
use Api\Support\Exception\ApiException;

final class AdminConfigPayloadNormalizer
{
    private const REQUIRED_INT_FIELDS = [
        'cf_login_point',
        'cf_memo_send_point',
        'cf_read_point',
        'cf_write_point',
        'cf_comment_point',
        'cf_download_point',
        'cf_write_pages',
        'cf_mobile_pages',
        'cf_point_term',
        'cf_delay_sec',
    ];

    public const BOOL_FIELDS = [
        'cf_use_point',
        'cf_use_email_certify',
        'cf_use_homepage',
        'cf_req_homepage',
        'cf_use_tel',
        'cf_req_tel',
        'cf_use_hp',
        'cf_req_hp',
        'cf_use_addr',
        'cf_req_addr',
        'cf_cert_use',
        'cf_cert_ipin',
        'cf_cert_hp',
        'cf_use_copy_log',
        'cf_social_login_use',
    ];

    public const INT_FIELDS = [
        'cf_register_level',
        'cf_register_point',
        'cf_login_point',
        'cf_write_point',
        'cf_comment_point',
        'cf_download_point',
        'cf_read_point',
        'cf_recommend_point',
        'cf_memo_send_point',
        'cf_point_term',
        'cf_delay_sec',
        'cf_new_del',
        'cf_memo_del',
        'cf_visit_del',
        'cf_popular_del',
        'cf_cut_name',
        'cf_nick_modify',
        'cf_open_modify',
        'cf_leave_day',
        'cf_new_rows',
        'cf_page_rows',
        'cf_mobile_page_rows',
        'cf_write_pages',
        'cf_mobile_pages',
        'cf_search_part',
        'cf_icon_level',
        'cf_use_member_icon',
        'cf_member_icon_width',
        'cf_member_icon_height',
        'cf_member_icon_size',
        'cf_member_img_width',
        'cf_member_img_height',
        'cf_member_img_size',
        'cf_cert_use_seed',
        'cf_cert_limit',
        'cf_icode_server_port',
    ];

    private const EMAIL_FIELDS = [
        'cf_admin_email',
    ];

    public const CSV_FIELDS = [
        'cf_social_servicelist' => ['naver', 'kakao', 'facebook', 'google', 'twitter', 'payco'],
    ];

    private const LEGACY_SANITIZED_TEXT_FIELDS = [
        'cf_cert_kcb_cd',
        'cf_cert_kcp_cd',
        'cf_cert_kcp_enckey',
        'cf_editor',
        'cf_recaptcha_site_key',
        'cf_recaptcha_secret_key',
        'cf_naver_clientid',
        'cf_naver_secret',
        'cf_facebook_appid',
        'cf_facebook_secret',
        'cf_twitter_key',
        'cf_twitter_secret',
        'cf_google_clientid',
        'cf_google_secret',
        'cf_googl_shorturl_apikey',
        'cf_kakao_rest_key',
        'cf_kakao_client_secret',
        'cf_kakao_js_apikey',
        'cf_payco_clientid',
        'cf_payco_secret',
        'cf_cert_kg_cd',
        'cf_cert_kg_mid',
    ];

    public function __construct(private readonly AdminConfigRepository $repository)
    {
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function normalize(array $payload): array
    {
        $unknown = array_values(array_diff(array_keys($payload), AdminConfigUpdateBuilder::UPDATABLE_FIELDS));
        if ($unknown !== []) {
            throw ApiException::badRequest(
                '관리자 설정 수정 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown)
            );
        }

        $normalized = [];
        foreach (AdminConfigUpdateBuilder::UPDATABLE_FIELDS as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }
            $value = $payload[$field];
            if (in_array($field, self::LEGACY_SANITIZED_TEXT_FIELDS, true)) {
                $normalized[$field] = preg_replace(
                    '/[^a-z0-9_\-\.]/i',
                    '',
                    trim($this->stringValue($field, $value))
                ) ?? '';
                continue;
            }

            if ($field === 'cf_icode_server_port') {
                $normalized[$field] = $this->normalizeDigitOnlyIntegerField($value);
                continue;
            }

            if (in_array($field, self::BOOL_FIELDS, true)) {
                $normalized[$field] = $this->toBoolInt($value);
                continue;
            }

            if (in_array($field, self::INT_FIELDS, true)) {
                $normalized[$field] = $this->normalizeIntegerField($field, $value);
                continue;
            }

            if (in_array($field, self::EMAIL_FIELDS, true)) {
                $email = trim($this->stringValue($field, $value));
                if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
                    throw ApiException::badRequest($field . ' 이메일 형식이 올바르지 않습니다.');
                }
                $normalized[$field] = $email;
                continue;
            }

            if (array_key_exists($field, self::CSV_FIELDS)) {
                $normalized[$field] = $this->normalizeCsvField($field, $value);
                continue;
            }

            $normalized[$field] = trim($this->stringValue($field, $value));
        }

        $this->validateAdminId($normalized);

        return $normalized;
    }

    public static function isIntegerField(string $field): bool
    {
        return in_array($field, self::INT_FIELDS, true) || in_array($field, self::BOOL_FIELDS, true);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function validateAdminId(array &$payload): void
    {
        if (!array_key_exists('cf_admin', $payload)) {
            return;
        }

        $adminId = trim((string)$payload['cf_admin']);
        $payload['cf_admin'] = $adminId;

        if ($adminId === '') {
            throw ApiException::badRequest('최고관리자 회원아이디가 존재하지 않습니다.');
        }

        if (!$this->repository->hasMemberId($adminId)) {
            throw ApiException::badRequest('최고관리자 회원아이디가 존재하지 않습니다.');
        }
    }

    private function toBoolInt(mixed $value): int
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if (is_int($value) && in_array($value, [0, 1], true)) {
            return $value;
        }
        if (!is_string($value)) {
            throw ApiException::badRequest('설정 플래그는 0 또는 1이어야 합니다.');
        }

        $normalized = strtolower(trim($value));
        if (in_array($normalized, ['1', 'true', 'on', 'yes', 'y'], true)) {
            return 1;
        }
        if (in_array($normalized, ['0', 'false', 'off', 'no', 'n'], true)) {
            return 0;
        }

        throw ApiException::badRequest('설정 플래그는 0 또는 1이어야 합니다.');
    }

    private function normalizeIntegerField(string $field, mixed $value): int
    {
        if (is_int($value)) {
            return $value;
        }
        if (!is_string($value)) {
            throw ApiException::badRequest($field . ' 값은 정수만 입력할 수 있습니다.');
        }

        $normalized = trim($value);
        if ($normalized === '') {
            if (in_array($field, self::REQUIRED_INT_FIELDS, true)) {
                throw ApiException::badRequest($field . ' 값은 비워둘 수 없습니다.');
            }

            return 0;
        }

        if (!preg_match('/^-?\d+$/', $normalized)) {
            throw ApiException::badRequest($field . ' 값은 정수만 입력할 수 있습니다.');
        }

        return (int)$normalized;
    }

    private function normalizeDigitOnlyIntegerField(mixed $value): int
    {
        if (is_int($value)) {
            return $value;
        }
        if (!is_string($value)) {
            throw ApiException::badRequest('cf_icode_server_port 값은 정수여야 합니다.');
        }

        $normalized = preg_replace('/[^0-9]/', '', trim($value)) ?? '';

        return $normalized === '' ? 0 : (int)$normalized;
    }

    private function normalizeCsvField(string $field, mixed $value): string
    {
        $allowedValues = self::CSV_FIELDS[$field];
        $values = [];

        if (is_array($value)) {
            $values = $value;
        } elseif (is_scalar($value)) {
            $stringValue = trim((string)$value);
            if ($stringValue !== '') {
                $values = explode(',', $stringValue);
            }
        }

        $normalized = [];
        foreach ($values as $item) {
            $candidate = strtolower(trim((string)$item));
            if ($candidate === '' || !in_array($candidate, $allowedValues, true)) {
                continue;
            }
            if (!in_array($candidate, $normalized, true)) {
                $normalized[] = $candidate;
            }
        }

        return implode(',', $normalized);
    }

    private function stringValue(string $field, mixed $value): string
    {
        if (!is_string($value)) {
            throw ApiException::badRequest($field . ' 값은 문자열이어야 합니다.');
        }

        return $value;
    }
}
