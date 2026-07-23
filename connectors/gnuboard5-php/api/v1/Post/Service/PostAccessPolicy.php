<?php

declare(strict_types=1);

namespace Api\Post\Service;

use Api\Core\Enum\MemberLevel;
use Api\Support\Exception\ApiException;

final class PostAccessPolicy
{
    public function requireMemberId(array $member): string
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 토큰이 필요합니다.');
        }

        return $memberId;
    }

    public function assertSecretReadable(array $post, array $member, array $board): void
    {
        $option = trim((string)($post['wr_option'] ?? ''));
        if (!$this->containsSecretOption($option)) {
            return;
        }

        $memberLevel = (int)($member['mb_level'] ?? 0);
        $memberId = trim((string)($member['mb_id'] ?? ''));
        $authorId = trim((string)($post['mb_id'] ?? ''));

        if (MemberLevel::fromNumeric($memberLevel)->isAdmin()) {
            return;
        }
        if ($memberId !== '' && $authorId !== '' && $memberId === $authorId) {
            return;
        }
        if (((int)($board['bo_use_secret'] ?? 0)) <= 0) {
            return;
        }

        throw ApiException::forbidden('비밀글은 작성자 또는 관리자만 열람할 수 있습니다.');
    }

    public function assertWriteDelay(?string $lastWriteAt, int $delaySeconds): void
    {
        if ($delaySeconds <= 0 || $lastWriteAt === null || trim($lastWriteAt) === '') {
            return;
        }

        $lastTimestamp = strtotime($lastWriteAt);
        if ($lastTimestamp !== false && (time() - $lastTimestamp) < $delaySeconds) {
            throw ApiException::tooManyRequests('연속 등록 제한 시간 내에는 다시 작성할 수 없습니다.');
        }
    }

    private function containsSecretOption(string $option): bool
    {
        if ($option === '') {
            return false;
        }

        return in_array('secret', array_filter(array_map('trim', explode(',', $option))), true);
    }
}
