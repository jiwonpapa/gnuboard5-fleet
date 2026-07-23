<?php

/**
 * AuthEmailRecoveryStore API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Repository;

use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;

final class AuthEmailRecoveryStore extends AuthRepositorySupport
{
    public function issueEmailVerifyToken(string $memberId, ?string $email = null): string
    {
        $normalizedId = $this->normalizeMemberId($memberId);
        if ($normalizedId === '') {
            throw ApiException::badRequest('회원아이디가 유효하지 않습니다.');
        }
        if (!$this->isValidMemberId($normalizedId)) {
            throw ApiException::badRequest('회원아이디 형식이 올바르지 않습니다.');
        }

        $setParts = [
            'mb_email_certify2 = :mb_email_certify2',
        ];
        $params = [
            'mb_id' => $normalizedId,
            'mb_email_certify2' => $this->encodeTimedToken(
                bin2hex(random_bytes(24)),
                time() + $this->emailVerifyTtlSeconds()
            ),
        ];

        $normalizedEmail = trim((string)$email);
        if ($normalizedEmail !== '') {
            if (!filter_var($normalizedEmail, FILTER_VALIDATE_EMAIL)) {
                throw ApiException::badRequest('이메일 형식이 올바르지 않습니다.');
            }

            if ($this->existsEmailForOther($normalizedEmail, $normalizedId)) {
                throw ApiException::conflict('이미 사용 중인 이메일입니다.');
            }

            $setParts[] = 'mb_email = :mb_email';
            $params['mb_email'] = $normalizedEmail;
        }

        $memberTable = $this->tables()->get('member');
        $this->executeStatement(
            "UPDATE {$memberTable}
             SET " . implode(', ', $setParts) . "
             WHERE mb_id = :mb_id",
            $params
        );

        $stored = $this->decodeTimedToken((string)$params['mb_email_certify2']);

        return $stored['token'];
    }

    public function confirmEmailVerifyToken(string $memberId, string $token): void
    {
        $normalizedId = $this->normalizeMemberId($memberId);
        $normalizedToken = trim($token);
        if ($normalizedId === '' || $normalizedToken === '') {
            throw ApiException::badRequest('회원아이디 또는 verify_token이 비어 있습니다.');
        }
        if (!$this->isValidMemberId($normalizedId)) {
            throw ApiException::badRequest('회원아이디 형식이 올바르지 않습니다.');
        }

        $memberTable = $this->tables()->get('member');
        $row = $this->fetchAssociative(
            "SELECT mb_email_certify2, mb_leave_date, mb_intercept_date
             FROM {$memberTable}
             WHERE mb_id = :mb_id
             LIMIT 1",
            ['mb_id' => $normalizedId]
        );

        if (!is_array($row)) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }

        $isInactive = trim((string)($row['mb_leave_date'] ?? '')) !== ''
            || trim((string)($row['mb_intercept_date'] ?? '')) !== '';
        if ($isInactive) {
            throw ApiException::forbidden('탈퇴 또는 차단된 회원입니다.');
        }

        $stored = $this->decodeTimedToken((string)($row['mb_email_certify2'] ?? ''));
        if ($stored['token'] === '' || !hash_equals($stored['token'], $normalizedToken)) {
            throw ApiException::unauthorized('유효하지 않은 이메일 인증 토큰입니다.');
        }
        if ($stored['expires_at'] > 0 && $stored['expires_at'] < time()) {
            $this->executeStatement(
                "UPDATE {$memberTable}
                 SET mb_email_certify2 = ''
                 WHERE mb_id = :mb_id",
                ['mb_id' => $normalizedId]
            );
            throw ApiException::unauthorized('만료된 이메일 인증 토큰입니다.');
        }

        $this->executeStatement(
            "UPDATE {$memberTable}
             SET mb_email_certify = :mb_email_certify,
                 mb_email_certify2 = ''
             WHERE mb_id = :mb_id",
            [
                'mb_email_certify' => G5DateTime::now(),
                'mb_id' => $normalizedId,
            ]
        );
    }

    private function existsEmailForOther(string $email, string $memberId): bool
    {
        if (!$this->isValidMemberId($memberId)) {
            return false;
        }

        $memberTable = $this->tables()->get('member');
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$memberTable}
             WHERE mb_email = :mb_email
               AND mb_id <> :mb_id",
            [
                'mb_email' => trim($email),
                'mb_id' => trim($memberId),
            ]
        );

        return ((int)($row['cnt'] ?? 0)) > 0;
    }
}
