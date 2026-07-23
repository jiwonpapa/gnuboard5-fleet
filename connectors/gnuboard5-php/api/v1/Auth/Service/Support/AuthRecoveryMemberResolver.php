<?php

declare(strict_types=1);

namespace Api\Auth\Service\Support;

use Api\Core\Enum\MemberLevel;
use Api\Auth\Contracts\AuthIdentityGateway;
use Api\Support\Exception\ApiException;

final class AuthRecoveryMemberResolver
{
    public function __construct(
        private readonly AuthIdentityGateway $authGateway
    ) {
    }

    /**
     * @return array<string, mixed>|null
     */
    public function resolvePasswordResetMember(string $normalizedEmail, string $normalizedMemberId): ?array
    {
        $member = null;
        if ($normalizedMemberId !== '') {
            $candidate = $this->authGateway->findMemberById($normalizedMemberId);
            if (is_array($candidate)) {
                $candidateEmail = trim((string)($candidate['mb_email'] ?? ''));
                if ($candidateEmail !== '' && strcasecmp($candidateEmail, $normalizedEmail) === 0) {
                    $member = $candidate;
                }
            }
        } else {
            $duplicateCount = $this->authGateway->countMembersByEmail($normalizedEmail);
            if ($duplicateCount > 1) {
                throw ApiException::badRequest('동일 이메일 계정이 2개 이상입니다. mb_id를 함께 입력해주세요.');
            }

            $member = $this->authGateway->findMemberByEmail($normalizedEmail);
        }

        if (
            !is_array($member)
            || !$this->authGateway->isMemberActive((string)($member['mb_id'] ?? ''))
            || MemberLevel::fromNumeric((int)($member['mb_level'] ?? 0))->isAdmin()
        ) {
            return null;
        }

        return $member;
    }

    /**
     * @return array<string, mixed>
     */
    public function resolveEmailReverificationMember(string $normalizedMemberId, string $normalizedPassword): array
    {
        $member = $this->authGateway->findMemberById($normalizedMemberId);
        if (
            !is_array($member)
            || !$this->authGateway->isMemberActive($normalizedMemberId)
            || !$this->authGateway->verifyPassword($member, $normalizedPassword)
        ) {
            throw ApiException::unauthorized('아이디 또는 비밀번호가 일치하지 않습니다.');
        }

        return $member;
    }
}
