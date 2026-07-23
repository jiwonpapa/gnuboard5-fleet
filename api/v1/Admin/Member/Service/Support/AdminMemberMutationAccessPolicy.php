<?php

declare(strict_types=1);

namespace Api\Admin\Member\Service\Support;

use Api\Core\Enum\MemberLevel;
use Api\Support\Exception\ApiException;

final class AdminMemberMutationAccessPolicy
{
    /**
     * @param array<string,mixed> $actor
     * @param array<string,mixed> $target
     * @param array<string,mixed> $payload
     */
    public function assertUpdateAllowed(array $actor, string $targetId, array $target, array $payload): void
    {
        $actorId = trim((string)($actor['mb_id'] ?? ''));
        $actorLevel = (int)($actor['mb_level'] ?? 0);
        $targetLevel = (int)($target['mb_level'] ?? 0);

        if ($targetLevel > $actorLevel) {
            throw ApiException::forbidden('상위 레벨 회원은 수정할 수 없습니다.');
        }

        if (MemberLevel::fromNumeric($targetLevel)->isAdmin() && array_key_exists('mb_password', $payload)) {
            throw ApiException::forbidden('최고관리자 비밀번호는 수정할 수 없습니다.');
        }

        if (MemberLevel::fromNumeric($targetLevel)->isAdmin() && array_key_exists('mb_intercept_date', $payload)) {
            throw ApiException::forbidden('최고관리자 차단일은 설정할 수 없습니다.');
        }

        if ($actorId !== '' && $actorId === $targetId && array_key_exists('mb_level', $payload)) {
            throw ApiException::forbidden('본인 레벨은 수정할 수 없습니다.');
        }
    }

    /**
     * @param array<string,mixed> $actor
     * @param array<string,mixed> $target
     */
    public function assertLevelChangeAllowed(array $actor, string $targetId, array $target, int $nextLevel): void
    {
        $actorId = trim((string)($actor['mb_id'] ?? ''));
        $actorLevel = (int)($actor['mb_level'] ?? 0);
        $targetLevel = (int)($target['mb_level'] ?? 0);

        if ($targetLevel > $actorLevel) {
            throw ApiException::forbidden('상위 레벨 회원은 수정할 수 없습니다.');
        }
        if (MemberLevel::fromNumeric($targetLevel)->isAdmin()) {
            throw ApiException::forbidden('최고관리자 레벨은 수정할 수 없습니다.');
        }
        if ($nextLevel > $actorLevel) {
            throw ApiException::forbidden('본인보다 높은 레벨로 설정할 수 없습니다.');
        }
        if ($actorId !== '' && $actorId === $targetId) {
            throw ApiException::forbidden('본인 레벨은 수정할 수 없습니다.');
        }
    }

    /**
     * @param array<string,mixed> $actor
     * @param array<string,mixed> $target
     */
    public function assertDeleteAllowed(array $actor, string $targetId, array $target): void
    {
        $actorId = trim((string)($actor['mb_id'] ?? ''));
        $actorLevel = (int)($actor['mb_level'] ?? 0);
        $targetLevel = (int)($target['mb_level'] ?? 0);

        if ($targetLevel > $actorLevel) {
            throw ApiException::forbidden('상위 레벨 회원은 탈퇴 처리할 수 없습니다.');
        }
        if (MemberLevel::fromNumeric($targetLevel)->isAdmin()) {
            throw ApiException::forbidden('최고관리자 계정은 탈퇴 처리할 수 없습니다.');
        }
        if ($actorId !== '' && $actorId === $targetId) {
            throw ApiException::forbidden('본인 계정은 관리자 삭제를 사용할 수 없습니다.');
        }
    }
}
