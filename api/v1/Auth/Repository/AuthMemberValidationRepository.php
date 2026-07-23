<?php

/**
 * AuthMemberValidationRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Repository;

use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;

final class AuthMemberValidationRepository extends AuthRepositorySupport
{
    public function __construct(
        private readonly AuthMemberQueryRepository $queryRepository,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null,
        ?\Api\Core\Security\PasswordCompat $passwordCompat = null,
        ?\Api\Core\Config\G5Config $configReader = null,
        ?\Api\Core\Config\EnvConfig $envConfig = null
    ) {
        parent::__construct($qb, $tables, $passwordCompat, $configReader, $envConfig);
    }

    public function validateRegisterPassword(string $password): void
    {
        $this->passwordPolicy()->validateOrFail($password);
    }

    public function validateRegisterMemberId(string $memberId): void
    {
        $normalized = trim($memberId);
        if ($normalized === '') {
            throw ApiException::badRequest('회원아이디를 입력해 주십시오.');
        }

        if (preg_match(ValidationPatterns::MEMBER_ID, $normalized) !== 1) {
            throw ApiException::badRequest('회원아이디는 영문자, 숫자, _ 조합 3~20자만 허용됩니다.');
        }

        if ($this->queryRepository->existsMemberId($normalized)) {
            throw ApiException::conflict('이미 사용중인 회원아이디 입니다.');
        }

        if (in_array(strtolower($normalized), $this->queryRepository->mergedProhibitMemberIds(), true)) {
            throw ApiException::badRequest('예약된 단어로 사용할 수 없는 회원아이디 입니다.');
        }
    }

    public function validateRegisterNick(string $nick): void
    {
        $normalized = $this->sanitizeSingleLine($nick);
        if ($normalized === '') {
            throw ApiException::badRequest('닉네임을 입력해 주십시오.');
        }

        $containsHangul = preg_match('/\p{Hangul}/u', $normalized) === 1;
        $minLength = $containsHangul ? 2 : 4;
        if (mb_strlen($normalized, 'UTF-8') < $minLength) {
            throw ApiException::badRequest('닉네임은 한글 2자 이상 또는 영문/숫자 4자 이상 입력 가능합니다.');
        }

        if ($this->queryRepository->isReservedNick($normalized)) {
            throw ApiException::badRequest('예약된 단어로 사용할 수 없는 닉네임 입니다.');
        }

        if (preg_match('/^[\p{Hangul}0-9a-z_]+$/iu', $normalized) !== 1) {
            throw ApiException::badRequest('닉네임은 한글/영문/숫자/_만 입력 가능합니다.');
        }

        if ($this->queryRepository->existsNick($normalized)) {
            throw ApiException::conflict('이미 존재하는 닉네임입니다.');
        }
    }

    public function validateRegisterEmail(string $email): void
    {
        $normalized = $this->sanitizeSingleLine($email);
        if ($normalized === '') {
            throw ApiException::badRequest('E-mail 주소를 입력해 주십시오.');
        }

        if (!filter_var($normalized, FILTER_VALIDATE_EMAIL)) {
            throw ApiException::badRequest('E-mail 주소가 형식에 맞지 않습니다.');
        }

        if ($this->queryRepository->existsEmail($normalized)) {
            throw ApiException::conflict('이미 사용중인 E-mail 주소입니다.');
        }

        $domain = strtolower((string)substr(strrchr($normalized, '@') ?: '', 1));
        $prohibitDomains = $this->queryRepository->mergedProhibitEmailDomains();
        if ($domain !== '' && in_array($domain, $prohibitDomains, true)) {
            throw ApiException::forbidden($domain . ' 메일은 사용할 수 없습니다.');
        }
    }

    public function validateRegisterPhone(string $phone): void
    {
        $normalized = $this->normalizePhone($phone);
        if ($normalized === '') {
            throw ApiException::badRequest('휴대폰 번호를 입력해 주십시오.');
        }

        if (preg_match('/^01[0-9][0-9]{7,8}$/', $normalized) !== 1) {
            throw ApiException::badRequest('휴대폰 번호 형식이 올바르지 않습니다.');
        }

        if ($this->queryRepository->existsHp($normalized)) {
            throw ApiException::conflict('이미 사용 중인 휴대폰 번호입니다.');
        }
    }
}
