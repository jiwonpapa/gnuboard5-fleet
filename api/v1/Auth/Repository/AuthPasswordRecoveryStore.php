<?php

/**
 * AuthPasswordRecoveryStore API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Repository;

use Api\Support\Exception\ApiException;

final class AuthPasswordRecoveryStore extends AuthRepositorySupport
{
    public function createPasswordResetToken(string $memberId): string
    {
        $normalizedId = $this->normalizeMemberId($memberId);
        if ($normalizedId === '') {
            throw ApiException::badRequest('회원아이디가 유효하지 않습니다.');
        }
        if (!$this->isValidMemberId($normalizedId)) {
            throw ApiException::badRequest('회원아이디 형식이 올바르지 않습니다.');
        }

        $token = bin2hex(random_bytes(32));
        $expiresAt = time() + $this->passwordResetTtlSeconds();
        $memberTable = $this->tables()->get('member');

        $affected = $this->executeStatement(
            "UPDATE {$memberTable}
             SET mb_lost_certify = :mb_lost_certify
             WHERE mb_id = :mb_id",
            [
                'mb_lost_certify' => $this->encodeTimedToken($token, $expiresAt),
                'mb_id' => $normalizedId,
            ]
        );

        if ($affected <= 0) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }

        return $token;
    }

    public function resetPasswordByToken(string $memberId, string $token, string $newPassword): void
    {
        $normalizedId = $this->normalizeMemberId($memberId);
        $normalizedToken = trim($token);
        if ($normalizedId === '' || $normalizedToken === '') {
            throw ApiException::badRequest('회원아이디 또는 reset_token이 비어 있습니다.');
        }
        if (!$this->isValidMemberId($normalizedId)) {
            throw ApiException::badRequest('회원아이디 형식이 올바르지 않습니다.');
        }

        $this->passwordPolicy()->validateOrFail($newPassword);
        $memberTable = $this->tables()->get('member');

        $row = $this->fetchAssociative(
            "SELECT mb_lost_certify
             FROM {$memberTable}
             WHERE mb_id = :mb_id
             LIMIT 1",
            ['mb_id' => $normalizedId]
        );

        $stored = $this->decodeTimedToken((string)($row['mb_lost_certify'] ?? ''));
        if ($stored['token'] === '' || !hash_equals($stored['token'], $normalizedToken)) {
            throw ApiException::unauthorized('유효하지 않은 비밀번호 재설정 토큰입니다.');
        }
        if ($stored['expires_at'] > 0 && $stored['expires_at'] < time()) {
            $this->executeStatement(
                "UPDATE {$memberTable}
                 SET mb_lost_certify = ''
                 WHERE mb_id = :mb_id",
                ['mb_id' => $normalizedId]
            );
            throw ApiException::unauthorized('만료된 비밀번호 재설정 토큰입니다.');
        }

        $this->executeStatement(
            "UPDATE {$memberTable}
             SET mb_password = :mb_password,
                 mb_lost_certify = ''
             WHERE mb_id = :mb_id",
            [
                'mb_password' => $this->password()->hash($newPassword),
                'mb_id' => $normalizedId,
            ]
        );
    }
}
