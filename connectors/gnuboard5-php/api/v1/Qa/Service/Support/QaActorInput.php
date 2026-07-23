<?php

declare(strict_types=1);

namespace Api\Qa\Service\Support;

use Api\Core\Enum\MemberLevel;
use Api\Support\Exception\ApiException;

final class QaActorInput
{
    /**
     * @param array<string, mixed> $member
     */
    public function requireMemberId(array $member): string
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 토큰이 필요합니다.');
        }

        return $memberId;
    }

    /**
     * @param array<string, mixed> $member
     */
    public function isAdmin(array $member): bool
    {
        return MemberLevel::fromNumeric((int)($member['mb_level'] ?? 0))->isAdmin();
    }

    /**
     * @param array<string, mixed> $member
     */
    public function assertAdmin(array $member): void
    {
        if (!$this->isAdmin($member)) {
            throw ApiException::forbidden('관리자만 수행할 수 있습니다.');
        }
    }

    /**
     * @param array<string, mixed> $member
     */
    public function resolveQaName(array $member, string $memberId): string
    {
        $nickname = trim((string)($member['mb_nick'] ?? $member['mb_name'] ?? ''));
        return $nickname === '' ? $memberId : $nickname;
    }
}
