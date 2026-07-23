<?php

/**
 * MemoInputNormalizer API module.
 *
 * @package  Gnuboard5\Api\v1\Memo\Service\Support
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Memo\Service\Support;

use Api\Support\Exception\ApiException;

final class MemoInputNormalizer
{
    private const MAX_RECIPIENTS = 10;
    private const MAX_MEMO_BYTES = 65536;

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
     * @param array<string, mixed> $query
     * @return array{kind:string,per_page:int,page:int,cursor:?string}
     */
    public function normalizeListQuery(array $query): array
    {
        $cursor = is_string($query['cursor'] ?? null) ? trim((string)$query['cursor']) : null;

        return [
            'kind' => $this->normalizeKind((string)($query['kind'] ?? 'recv')),
            'per_page' => max(1, min(100, (int)($query['per_page'] ?? 20))),
            'page' => max(1, (int)($query['page'] ?? 1)),
            'cursor' => $cursor,
        ];
    }

    public function normalizeKind(string $kind): string
    {
        $normalized = strtolower(trim($kind));
        if (!in_array($normalized, ['recv', 'send'], true)) {
            throw ApiException::badRequest('kind 값은 recv 또는 send만 허용됩니다.');
        }

        return $normalized;
    }

    public function requireMemoId(int $meId): int
    {
        if ($meId <= 0) {
            throw ApiException::badRequest('me_id는 1 이상의 정수여야 합니다.');
        }

        return $meId;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{recipients:list<string>,memo:string}
     */
    public function normalizeSendPayload(array $payload): array
    {
        return [
            'recipients' => $this->parseRecipients((string)($payload['me_recv_mb_id'] ?? '')),
            'memo' => $this->sanitizeMemo((string)($payload['me_memo'] ?? '')),
        ];
    }

    /**
     * @return list<string>
     */
    private function parseRecipients(string $raw): array
    {
        $candidates = array_map('trim', explode(',', $raw));
        $recipients = [];
        foreach ($candidates as $candidate) {
            if ($candidate === '') {
                continue;
            }

            $sanitized = substr(preg_replace('/[^a-zA-Z0-9_]/', '', $candidate) ?? '', 0, 20);
            if ($sanitized === '') {
                continue;
            }

            $recipients[] = $sanitized;
        }

        $recipients = array_values(array_unique($recipients));
        if ($recipients === []) {
            throw ApiException::badRequest('수신자 아이디를 입력해주세요.');
        }

        if (count($recipients) > self::MAX_RECIPIENTS) {
            throw ApiException::badRequest('수신자는 최대 ' . self::MAX_RECIPIENTS . '명까지 지정할 수 있습니다.');
        }

        return $recipients;
    }

    private function sanitizeMemo(string $memo): string
    {
        $trimmed = trim($memo);
        if ($trimmed === '') {
            throw ApiException::badRequest('쪽지 내용을 입력해주세요.');
        }

        $truncated = mb_strcut($trimmed, 0, self::MAX_MEMO_BYTES, 'UTF-8');
        if ($truncated === '') {
            throw ApiException::badRequest('쪽지 내용을 입력해주세요.');
        }

        return htmlspecialchars($truncated, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
