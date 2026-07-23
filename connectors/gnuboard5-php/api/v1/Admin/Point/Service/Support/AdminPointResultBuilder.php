<?php

declare(strict_types=1);

namespace Api\Admin\Point\Service\Support;

use Api\Core\Util\G5DateTime;

final class AdminPointResultBuilder
{
    /**
     * @return array<string,int|bool>
     */
    public function pagination(int $page, int $perPage, int $total): array
    {
        $lastPage = max(1, (int)ceil($total / $perPage));

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => $lastPage,
            'has_next' => $page < $lastPage,
            'has_prev' => $page > 1,
        ];
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $updatedMember
     * @return array<string,mixed>
     */
    public function pointChange(string $memberId, array $member, array $updatedMember, int $changedPoint, string $content): array
    {
        return [
            'mb_id' => $memberId,
            'before_point' => (int)($member['mb_point'] ?? 0),
            'changed_point' => $changedPoint,
            'after_point' => (int)($updatedMember['mb_point'] ?? 0),
            'po_content' => $content,
            'processed_at' => G5DateTime::now(),
        ];
    }

    public function actorRelId(string $actorId): string
    {
        $normalizedActor = trim($actorId) === '' ? 'admin' : trim($actorId);
        $actorPrefix = substr($normalizedActor, 0, 8);
        $suffixLength = 19 - strlen($actorPrefix);

        return $actorPrefix . '-' . substr(bin2hex(random_bytes(10)), 0, $suffixLength);
    }
}
