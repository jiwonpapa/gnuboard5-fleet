<?php

declare(strict_types=1);

namespace Api\Admin\Poll\Service\Support;

use Api\Support\Exception\ApiException;

final class AdminPollVoteInputNormalizer
{
    /** @param array<string,mixed> $payload @return array{poll_no:int,po_etc_text:string} */
    public function normalizePayload(array $payload): array
    {
        $allowed = ['poll_no', 'gb_poll', 'po_etc_text', 'pc_idea'];
        $unknown = array_values(array_diff(array_keys($payload), $allowed));
        if ($unknown !== []) {
            throw ApiException::badRequest('투표 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown));
        }
        if (array_key_exists('poll_no', $payload) && array_key_exists('gb_poll', $payload)) {
            throw ApiException::badRequest('poll_no와 gb_poll은 동시에 사용할 수 없습니다.');
        }
        if (array_key_exists('po_etc_text', $payload) && array_key_exists('pc_idea', $payload)) {
            throw ApiException::badRequest('po_etc_text와 pc_idea는 동시에 사용할 수 없습니다.');
        }

        $idea = $payload['po_etc_text'] ?? $payload['pc_idea'] ?? '';
        if (!is_string($idea)) {
            throw ApiException::badRequest('po_etc_text는 문자열이어야 합니다.');
        }

        return [
            'poll_no' => $this->requirePollNo($payload['poll_no'] ?? $payload['gb_poll'] ?? null),
            'po_etc_text' => trim($idea),
        ];
    }

    public function requirePollId(int $pollId): int
    {
        if ($pollId <= 0) {
            throw ApiException::badRequest('po_id는 1 이상의 정수여야 합니다.');
        }

        return $pollId;
    }

    public function requirePollNo(mixed $value): int
    {
        if (is_int($value)) {
            $pollNo = $value;
        } elseif (is_string($value) && preg_match('/^[1-9]$/', trim($value)) === 1) {
            $pollNo = (int)$value;
        } else {
            $pollNo = 0;
        }
        if ($pollNo < 1 || $pollNo > 9) {
            throw ApiException::badRequest('poll_no는 1~9 범위여야 합니다.');
        }

        return $pollNo;
    }

    /**
     * @param array<string, mixed> $member
     */
    public function memberId(array $member): string
    {
        return trim((string)($member['mb_id'] ?? ''));
    }

    /**
     * @param array<string, mixed> $member
     */
    public function memberLevel(array $member): int
    {
        if ($this->memberId($member) === '') {
            return 1;
        }

        return max(1, (int)($member['mb_level'] ?? 1));
    }

    /**
     * @param array<string, mixed> $member
     */
    public function voterName(array $member, string $memberId): string
    {
        $name = trim((string)($member['mb_nick'] ?? $member['mb_name'] ?? ''));
        if ($name !== '') {
            return $name;
        }

        return $memberId === '' ? 'guest' : $memberId;
    }
}
