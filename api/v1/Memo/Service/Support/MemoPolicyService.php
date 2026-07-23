<?php

/**
 * MemoPolicyService API module.
 *
 * @package  Gnuboard5\Api\v1\Memo\Service\Support
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Memo\Service\Support;

use Api\Core\Enum\MemberLevel;
use Api\Support\Exception\ApiException;

final class MemoPolicyService
{
    /**
     * @param array<string, mixed> $member
     */
    public function assertSendAllowed(array $member): bool
    {
        $isAdmin = MemberLevel::fromNumeric((int)($member['mb_level'] ?? 0))->isAdmin();
        if (!$isAdmin && (int)($member['mb_open'] ?? 0) !== 1) {
            throw ApiException::forbidden('정보를 공개하지 않으면 쪽지를 보낼 수 없습니다.');
        }

        return $isAdmin;
    }

    /**
     * @param array<string, mixed> $member
     */
    public function assertEnoughPoints(array $member, int $memoSendPoint, int $recipientCount, bool $isAdmin): void
    {
        if ($isAdmin || $memoSendPoint <= 0) {
            return;
        }

        $requiredPoint = $memoSendPoint * $recipientCount;
        $currentPoint = (int)($member['mb_point'] ?? 0);
        if ($currentPoint < $requiredPoint) {
            throw ApiException::forbidden('포인트가 부족합니다.');
        }
    }

    /**
     * @param array<string, mixed> $memo
     */
    public function isUnread(array $memo): bool
    {
        $readDatetime = trim((string)($memo['me_read_datetime'] ?? ''));

        return $readDatetime === ''
            || $readDatetime === '1000-01-01 00:00:00'
            || str_starts_with($readDatetime, '0000-00-00');
    }
}
