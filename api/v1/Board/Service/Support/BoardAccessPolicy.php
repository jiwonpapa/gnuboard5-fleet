<?php

declare(strict_types=1);

namespace Api\Board\Service\Support;

use Api\Core\Enum\MemberLevel;
use Api\Integration\Contracts\BoardGateway;
use Api\Support\Exception\ApiException;

final class BoardAccessPolicy
{
    public function resolveAdminRole(array $member, array $board): ?string
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        $memberLevel = (int)($member['mb_level'] ?? 0);

        if (MemberLevel::fromNumeric($memberLevel)->isAdmin()) {
            return 'super';
        }

        if ($memberId === '') {
            return null;
        }

        $groupAdmin = trim((string)($board['gr_admin'] ?? ''));
        if ($groupAdmin !== '' && $groupAdmin === $memberId) {
            return 'group';
        }

        $boardAdmin = trim((string)($board['bo_admin'] ?? ''));
        if ($boardAdmin !== '' && $boardAdmin === $memberId) {
            return 'board';
        }

        return null;
    }

    public function isAllowed(BoardGateway $boardGateway, array $member, array $board, string $levelField): bool
    {
        if (!$this->isGroupAccessible($boardGateway, $member, $board)) {
            return false;
        }

        $memberLevel = (int)($member['mb_level'] ?? 255);
        $requiredLevel = (int)($board[$levelField] ?? 0);

        return $memberLevel <= 0 ? true : $memberLevel >= $requiredLevel;
    }

    public function assertGroupAccess(BoardGateway $boardGateway, array $member, array $board): void
    {
        $useAccess = (int)($board['gr_use_access'] ?? 0);
        if ($useAccess !== 1) {
            return;
        }

        if ($this->resolveAdminRole($member, $board) !== null) {
            return;
        }

        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::forbidden('그룹 접근 권한이 없습니다.');
        }

        $groupId = trim((string)($board['gr_id'] ?? ''));
        if ($groupId === '') {
            throw ApiException::forbidden('그룹 접근 권한이 없습니다.');
        }

        if (!$boardGateway->isGroupMember($groupId, $memberId)) {
            throw ApiException::forbidden('그룹 접근 권한이 없습니다.');
        }
    }

    private function isGroupAccessible(BoardGateway $boardGateway, array $member, array $board): bool
    {
        $useAccess = (int)($board['gr_use_access'] ?? 0);
        if ($useAccess !== 1) {
            return true;
        }

        if ($this->resolveAdminRole($member, $board) !== null) {
            return true;
        }

        $memberId = trim((string)($member['mb_id'] ?? ''));
        $groupId = trim((string)($board['gr_id'] ?? ''));
        if ($memberId === '' || $groupId === '') {
            return false;
        }

        return $boardGateway->isGroupMember($groupId, $memberId);
    }
}
