<?php

/**
 * AuthSessionPolicy API module.
 *
 * @package  Gnuboard5\Api\v1\Auth\Service\Support
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Auth\Service\Support;

use Api\Core\Config\EnvConfig;
use Api\Auth\Contracts\AuthIdentityGateway;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;

final class AuthSessionPolicy
{
    private const DEFAULT_LOGIN_FAIL_MAX_ATTEMPTS = 5;
    private const DEFAULT_LOGIN_FAIL_WINDOW_SECONDS = 300;

    public function assertLoginInput(string $memberId, string $password): string
    {
        $normalizedMemberId = trim($memberId);
        if ($normalizedMemberId === '' || $password === '') {
            throw ApiException::badRequest('아이디/비밀번호를 입력해주세요.');
        }

        $this->assertValidMemberId($normalizedMemberId, 'mb_id 형식이 올바르지 않습니다.');

        return $normalizedMemberId;
    }

    public function assertRefreshMemberId(string $memberId): string
    {
        $normalizedMemberId = trim($memberId);
        if ($normalizedMemberId === '') {
            throw ApiException::unauthorized('Refresh 토큰에 사용자 정보가 없습니다.');
        }

        if (!$this->isValidMemberId($normalizedMemberId)) {
            throw ApiException::unauthorized('Refresh 토큰의 사용자 정보가 유효하지 않습니다.');
        }

        return $normalizedMemberId;
    }

    /**
     * @param array<string, mixed> $member
     */
    public function assertAuthenticatedMember(array $member): string
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 토큰이 필요합니다.');
        }

        if (!$this->isValidMemberId($memberId)) {
            throw ApiException::unauthorized('회원 정보가 올바르지 않습니다.');
        }

        return $memberId;
    }

    public function assertMemberIsActive(AuthIdentityGateway $authGateway, string $memberId, string $message): void
    {
        if (!$authGateway->isMemberActive($memberId)) {
            throw ApiException::forbidden($message);
        }
    }

    /**
     * @param array<string, mixed> $member
     */
    public function assertEmailCertified(AuthIdentityGateway $authGateway, array $member): void
    {
        if ($authGateway->isEmailCertificationRequiredAndMissing($member)) {
            throw ApiException::forbidden('이메일 인증 후 로그인할 수 있습니다.');
        }
    }

    /**
     * @return array{max_attempts:int, window_seconds:int}
     */
    public function loginThrottle(EnvConfig $envConfig): array
    {
        return [
            'max_attempts' => max(1, $envConfig->loginFailMaxAttempts ?: self::DEFAULT_LOGIN_FAIL_MAX_ATTEMPTS),
            'window_seconds' => max(60, $envConfig->loginFailWindowSeconds ?: self::DEFAULT_LOGIN_FAIL_WINDOW_SECONDS),
        ];
    }

    private function assertValidMemberId(string $memberId, string $message): void
    {
        if (!$this->isValidMemberId($memberId)) {
            throw ApiException::badRequest($message);
        }
    }

    private function isValidMemberId(string $memberId): bool
    {
        return preg_match(ValidationPatterns::MEMBER_ID, trim($memberId)) === 1;
    }
}
