<?php

declare(strict_types=1);

namespace Api\Member\Service\Support;

use Api\Support\Exception\ApiException;

final class MemberProfileFieldPolicy
{
    /**
     * @var list<string>
     */
    private const ALLOWED_UPDATE_FIELDS = [
        'mb_password',
        'mb_nick',
        'mb_email',
        'mb_hp',
        'mb_tel',
        'mb_homepage',
        'mb_addr3',
        'mb_addr_jibeon',
        'mb_zip',
        'mb_zip1',
        'mb_zip2',
        'mb_addr1',
        'mb_addr2',
        'mb_open',
        'mb_mailling',
        'mb_sms',
        'mb_marketing_agree',
        'mb_thirdparty_agree',
        'mb_signature',
        'mb_profile',
        'mb_1',
        'mb_2',
        'mb_3',
        'mb_4',
        'mb_5',
        'mb_6',
        'mb_7',
        'mb_8',
        'mb_9',
        'mb_10',
    ];

    /**
     * @param array<string, mixed> $payload
     */
    public function validatePayloadKeys(array $payload): void
    {
        foreach (array_keys($payload) as $key) {
            if (!in_array((string)$key, self::ALLOWED_UPDATE_FIELDS, true)) {
                throw ApiException::forbidden('허용되지 않은 수정 필드가 포함되어 있습니다.');
            }
        }
    }

    /**
     * @return list<string>
     */
    public function allowedUpdateFields(): array
    {
        return self::ALLOWED_UPDATE_FIELDS;
    }
}
