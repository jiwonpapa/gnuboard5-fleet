<?php

/**
 * 관리자 설정 응답을 공개 가능한 canonical 필드와 타입으로 제한합니다.
 *
 * @package  Gnuboard5\Api\v1\Admin\Config\Support
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Admin\Config\Support;

use Api\Admin\Config\Repository\AdminConfigUpdateBuilder;

final class AdminConfigPresenter
{
    public const SENSITIVE_FIELDS = [
        'cf_cert_kcp_enckey',
        'cf_recaptcha_secret_key',
        'cf_syndi_token',
        'cf_facebook_secret',
        'cf_twitter_secret',
        'cf_googl_shorturl_apikey',
        'cf_google_secret',
        'cf_kakao_rest_key',
        'cf_kakao_client_secret',
        'cf_naver_secret',
        'cf_payco_secret',
        'cf_icode_pw',
        'cf_icode_token_key',
    ];

    /**
     * @param array<string,mixed> $config
     * @return array<string,int|string>
     */
    public function present(array $config): array
    {
        $result = [];
        foreach (AdminConfigUpdateBuilder::UPDATABLE_FIELDS as $field) {
            if (in_array($field, self::SENSITIVE_FIELDS, true) || !array_key_exists($field, $config)) {
                continue;
            }

            $result[$field] = AdminConfigPayloadNormalizer::isIntegerField($field)
                ? (int)$config[$field]
                : (string)$config[$field];
        }

        return $result;
    }
}
