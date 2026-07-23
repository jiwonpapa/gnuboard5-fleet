<?php

declare(strict_types=1);

namespace Api\Comment\Service\Support;

use Api\Support\Exception\ApiException;

final class CommentInputNormalizer
{
    public function __construct(private readonly int $maxContentLength = 10000)
    {
    }

    public function wrId(int $value): int
    {
        if ($value <= 0) {
            throw ApiException::badRequest('wr_id는 1 이상의 정수여야 합니다.');
        }

        return $value;
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function content(array $payload): string
    {
        if (!isset($payload['wr_content']) || !is_string($payload['wr_content'])) {
            throw ApiException::badRequest('wr_content는 문자열이어야 합니다.');
        }
        $content = trim($payload['wr_content']);
        if ($content === '') {
            throw ApiException::badRequest('wr_content는 필수입니다.');
        }
        if (mb_strlen($content) > $this->maxContentLength) {
            throw ApiException::badRequest('wr_content가 너무 깁니다.');
        }

        return htmlspecialchars($content, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    /** @param array<string,mixed> $payload */
    public function assertCreatePayload(array $payload): void
    {
        $this->assertAllowedFields($payload, ['wr_content', 'parent_comment_id'], '댓글 작성');
    }

    /** @param array<string,mixed> $payload */
    public function assertUpdatePayload(array $payload): void
    {
        $this->assertAllowedFields($payload, ['wr_content'], '댓글 수정');
    }

    /** @param array<string,mixed> $payload @param list<string> $allowed */
    private function assertAllowedFields(array $payload, array $allowed, string $context): void
    {
        $unknown = array_values(array_diff(array_keys($payload), $allowed));
        if ($unknown !== []) {
            throw ApiException::badRequest(
                $context . ' 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown)
            );
        }
    }

    public function optionalInt(mixed $value, string $field): ?int
    {
        if ($value === null) {
            return null;
        }

        $raw = trim((string)$value);
        if ($raw === '') {
            return null;
        }

        if (!preg_match('/^(0|[1-9][0-9]*)$/', $raw)) {
            throw ApiException::badRequest($field . '는 정수여야 합니다.');
        }

        $int = (int)$raw;
        if ($int <= 0) {
            throw ApiException::badRequest($field . '는 1 이상의 정수여야 합니다.');
        }

        if ($int > PHP_INT_MAX) {
            throw ApiException::badRequest($field . '는 정수여야 합니다.');
        }

        return $this->wrId($int);
    }

    /**
     * @param array<string,mixed> $member
     */
    public function memberId(array $member): string
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 사용자 정보가 없습니다.');
        }

        return $memberId;
    }

    public function assertWriteDelay(?string $lastWriteAt, int $delaySeconds): void
    {
        if ($delaySeconds <= 0 || $lastWriteAt === null || trim($lastWriteAt) === '') {
            return;
        }

        $lastTimestamp = strtotime($lastWriteAt);
        if ($lastTimestamp === false) {
            return;
        }

        if ((time() - $lastTimestamp) < $delaySeconds) {
            throw ApiException::tooManyRequests('연속 등록 제한 시간 내에는 다시 작성할 수 없습니다.');
        }
    }
}
