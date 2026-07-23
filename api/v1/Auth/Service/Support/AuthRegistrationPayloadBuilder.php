<?php

declare(strict_types=1);

namespace Api\Auth\Service\Support;

use Api\Auth\Service\AuthInputHelper;
use Api\Auth\Contracts\AuthRegistrationGateway;
use Api\Support\Exception\ApiException;

final readonly class AuthRegistrationPayloadBuilder
{
    private const RESTRICTED_IDENTITY_FIELDS = [
        'mb_birth',
        'mb_sex',
        'mb_certify',
        'mb_adult',
        'mb_dupinfo',
    ];

    public function __construct(
        private AuthRegistrationGateway $authGateway,
        private AuthInputHelper $inputHelper
    ) {
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function build(array $member): array
    {
        $this->assertNoRestrictedIdentityFields($member);

        $memberId = $this->inputHelper->sanitizeSingleLine((string)($member['mb_id'] ?? ''));
        $password = (string)($member['mb_password'] ?? '');
        $name = $this->inputHelper->sanitizeSingleLine((string)($member['mb_name'] ?? ''));
        $nick = $this->inputHelper->sanitizeSingleLine((string)($member['mb_nick'] ?? ''));
        $email = $this->inputHelper->sanitizeSingleLine((string)($member['mb_email'] ?? ''));
        $phone = $this->inputHelper->normalizePhone((string)($member['mb_hp'] ?? ''));

        $this->authGateway->validateRegisterMemberId($memberId);
        $this->assertValidName($name);
        $this->authGateway->validateRegisterNick($nick);
        $this->authGateway->validateRegisterEmail($email);
        if ($phone !== '') {
            $this->authGateway->validateRegisterPhone($phone);
        }
        $this->authGateway->validateRegisterPassword($password);

        return [
            'mb_id' => $memberId,
            'mb_password' => $password,
            'mb_name' => $name,
            'mb_nick' => $nick,
            'mb_email' => $email,
            'mb_hp' => $phone,
            'mb_ip' => trim((string)($member['mb_ip'] ?? '')),
            'mb_recommend' => trim((string)($member['mb_recommend'] ?? '')),
            'mb_mailling' => $this->inputHelper->toBoolFlag($member['mb_mailling'] ?? null),
            'mb_sms' => $this->inputHelper->toBoolFlag($member['mb_sms'] ?? null),
            'mb_open' => $this->inputHelper->toBoolFlag($member['mb_open'] ?? null),
            'mb_marketing_agree' => $this->inputHelper->toBoolFlag($member['mb_marketing_agree'] ?? null),
            'mb_thirdparty_agree' => $this->inputHelper->toBoolFlag($member['mb_thirdparty_agree'] ?? null),
            'mb_homepage' => $this->inputHelper->sanitizeSingleLine((string)($member['mb_homepage'] ?? '')),
            'mb_tel' => $this->inputHelper->sanitizeSingleLine((string)($member['mb_tel'] ?? '')),
            'mb_signature' => $this->inputHelper->sanitizeMultiline((string)($member['mb_signature'] ?? '')),
            'mb_profile' => $this->inputHelper->sanitizeMultiline((string)($member['mb_profile'] ?? '')),
            'mb_addr1' => $this->inputHelper->sanitizeSingleLine((string)($member['mb_addr1'] ?? '')),
            'mb_addr2' => $this->inputHelper->sanitizeSingleLine((string)($member['mb_addr2'] ?? '')),
            'mb_addr3' => $this->inputHelper->sanitizeSingleLine((string)($member['mb_addr3'] ?? '')),
            'mb_addr_jibeon' => $this->inputHelper->normalizeJibeon((string)($member['mb_addr_jibeon'] ?? '')),
            'mb_zip' => $this->inputHelper->sanitizeSingleLine((string)($member['mb_zip'] ?? '')),
            'mb_zip1' => $this->inputHelper->sanitizeSingleLine((string)($member['mb_zip1'] ?? '')),
            'mb_zip2' => $this->inputHelper->sanitizeSingleLine((string)($member['mb_zip2'] ?? '')),
        ];
    }

    /**
     * @param array<string, mixed> $member
     */
    private function assertNoRestrictedIdentityFields(array $member): void
    {
        foreach (self::RESTRICTED_IDENTITY_FIELDS as $field) {
            if (!array_key_exists($field, $member)) {
                continue;
            }

            throw ApiException::forbidden('본인확인 필드는 공개 회원가입 API에서 직접 설정할 수 없습니다.');
        }
    }

    private function assertValidName(string $name): void
    {
        if ($name === '') {
            throw ApiException::badRequest('이름을 입력해주세요.');
        }
        if (!mb_check_encoding($name, 'UTF-8')) {
            throw ApiException::badRequest('이름 인코딩이 올바르지 않습니다.');
        }
    }
}
