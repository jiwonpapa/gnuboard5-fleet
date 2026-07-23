<?php

declare(strict_types=1);

namespace Api\Admin\Config\Support;

use Api\Support\Exception\ApiException;

final class AdminConfigPayloadGuard
{
    private const REQUIRED_STRING_FIELDS = [
        'cf_title',
        'cf_admin',
        'cf_admin_email',
        'cf_admin_email_name',
        'cf_new_skin',
        'cf_mobile_new_skin',
        'cf_search_skin',
        'cf_mobile_search_skin',
        'cf_connect_skin',
        'cf_mobile_connect_skin',
        'cf_faq_skin',
        'cf_mobile_faq_skin',
        'cf_captcha',
        'cf_captcha_mp3',
        'cf_member_skin',
        'cf_mobile_member_skin',
    ];

    /**
     * @param array<string, mixed> $payload
     */
    public function applyLegacyDerivedMutations(array &$payload): void
    {
        if (($payload['cf_cert_use'] ?? null) !== 0) {
            return;
        }

        $payload['cf_cert_ipin'] = '';
        $payload['cf_cert_hp'] = '';
        $payload['cf_cert_simple'] = '';
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function assertRequiredFields(array $payload): void
    {
        foreach (self::REQUIRED_STRING_FIELDS as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }

            if (trim((string)$payload[$field]) === '') {
                throw ApiException::badRequest($field . ' 값은 비워둘 수 없습니다.');
            }
        }
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function assertMergedState(array $payload): void
    {
        if ($this->toBoolInt($payload['cf_cert_use'] ?? 0) === 0) {
            return;
        }

        $hasCertificationMethod =
            $this->toBoolInt($payload['cf_cert_ipin'] ?? 0) === 1
            || $this->toBoolInt($payload['cf_cert_hp'] ?? 0) === 1
            || trim((string)($payload['cf_cert_simple'] ?? '')) !== '';

        if ($hasCertificationMethod) {
            return;
        }

        throw ApiException::badRequest(
            '본인확인을 위해 아이핀, 휴대폰 본인확인, KG이니시스 간편인증 서비스 중 하나 이상 선택해 주십시오.'
        );
    }

    private function toBoolInt(mixed $value): int
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if (is_int($value) || is_float($value)) {
            return ((int)$value) > 0 ? 1 : 0;
        }

        $normalized = strtolower(trim((string)$value));

        return in_array($normalized, ['1', 'true', 'on', 'yes', 'y'], true) ? 1 : 0;
    }
}
