<?php

/**
 * MemberValidationRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Member\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Member\Repository;

use Api\Support\Exception\ApiException;

final class MemberValidationRepository extends MemberRepositorySupport
{
    public function __construct(
        private readonly MemberQueryRepository $queryRepository,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null,
        ?\Api\Core\Security\PasswordCompat $passwordCompat = null,
        ?\Api\Core\Config\EnvConfig $envConfig = null
    ) {
        parent::__construct($qb, $tables, $passwordCompat, $envConfig);
    }

    public function verifyPassword(array $member, string $password): bool
    {
        $hash = (string)($member['mb_password'] ?? '');
        if ($hash === '') {
            return false;
        }

        return $this->password()->verify($password, $hash);
    }

    public function validatePassword(string $password): void
    {
        $this->passwordPolicy()->validateOrFail($password);
    }

    public function hashPassword(string $password): string
    {
        return $this->password()->hash($password);
    }

    public function validateNicknameForUpdate(string $nickname, string $memberId): void
    {
        $normalized = $this->sanitizeSingleLine($nickname);
        if ($normalized === '') {
            throw ApiException::badRequest('닉네임을 입력해 주세요.');
        }

        $containsHangul = preg_match('/\p{Hangul}/u', $normalized) === 1;
        $minLength = $containsHangul ? 2 : 4;
        if (mb_strlen($normalized, 'UTF-8') < $minLength) {
            throw ApiException::badRequest('닉네임은 한글 2자 이상 또는 영문/숫자 4자 이상이어야 합니다.');
        }

        if ($this->queryRepository->isReservedNick($normalized)) {
            throw ApiException::badRequest('예약된 단어로 사용할 수 없는 닉네임 입니다.');
        }

        if (preg_match('/^[\p{Hangul}0-9A-Za-z_]+$/u', $normalized) !== 1) {
            throw ApiException::badRequest('닉네임은 한글/영문/숫자/_만 허용됩니다.');
        }

        $member = $this->queryRepository->findById($memberId);
        if ($member === null) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }

        $currentNick = trim((string)($member['mb_nick'] ?? ''));
        if ($currentNick !== '' && strcasecmp($currentNick, $normalized) === 0) {
            return;
        }

        $cooldownDays = $this->queryRepository->getNicknameCooldownDays();
        if ($cooldownDays > 0) {
            $nickDate = trim((string)($member['mb_nick_date'] ?? ''));
            if ($nickDate !== '') {
                $limitDate = date('Y-m-d', time() - ($cooldownDays * 86400));
                if ($nickDate > $limitDate) {
                    throw ApiException::forbidden("닉네임은 {$cooldownDays}일마다 변경할 수 있습니다.");
                }
            }
        }

        if ($this->queryRepository->existsNick($normalized, $memberId)) {
            throw ApiException::conflict('이미 사용 중인 닉네임입니다.');
        }
    }

    public function validateEmailForUpdate(string $email, string $memberId): void
    {
        $normalized = $this->sanitizeSingleLine($email);
        if ($normalized === '') {
            throw ApiException::badRequest('이메일을 입력해 주세요.');
        }

        if (!filter_var($normalized, FILTER_VALIDATE_EMAIL)) {
            throw ApiException::badRequest('이메일 형식이 올바르지 않습니다.');
        }

        if ($this->queryRepository->isProhibitedEmailDomain($normalized)) {
            $domain = strtolower((string)substr(strrchr($normalized, '@') ?: '', 1));
            throw ApiException::forbidden($domain . ' 메일은 사용할 수 없습니다.');
        }

        if ($this->queryRepository->existsEmail($normalized, $memberId)) {
            throw ApiException::conflict('이미 사용 중인 이메일입니다.');
        }
    }

    public function validatePhoneForUpdate(string $phone, string $memberId): void
    {
        $normalized = $this->normalizePhone($phone);
        if ($normalized === '') {
            throw ApiException::badRequest('휴대폰 번호를 입력해 주세요.');
        }

        if (preg_match('/^01[0-9][0-9]{7,8}$/', $normalized) !== 1) {
            throw ApiException::badRequest('휴대폰 번호 형식이 올바르지 않습니다.');
        }

        if ($this->queryRepository->existsHpForOther($normalized, $memberId)) {
            throw ApiException::conflict('이미 사용 중인 휴대폰 번호입니다.');
        }
    }

    private function sanitizeSingleLine(string $value): string
    {
        $normalized = str_replace("\0", '', $value);
        $normalized = strip_tags($normalized);

        return trim($normalized);
    }

    private function normalizePhone(string $value): string
    {
        $digits = preg_replace('/[^0-9]/', '', $this->sanitizeSingleLine($value));
        if (!is_string($digits)) {
            return '';
        }

        return $digits;
    }
}
