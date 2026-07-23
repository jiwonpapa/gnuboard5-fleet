<?php

/**
 * 게시글 정보를 캡슐화하는 불변 데이터 전송 객체.
 *
 * @package  Api\Core\DTO
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\DTO;

final class PostDTO implements \JsonSerializable
{
    public function __construct(
        public readonly int $wrId,
        public readonly int $wrNum,
        public readonly int $wrParent,
        public readonly int $wrIsComment,
        public readonly int $wrComment,
        public readonly string $wrCommentReply,
        public readonly string $wrSubject,
        public readonly string $wrContent,
        public readonly string $wrName,
        public readonly ?string $wrEmail,
        public readonly ?string $wrHp,
        public readonly ?string $wrDatetime,
        public readonly int $wrHit,
        public readonly int $wrGood,
        public readonly int $wrNogood,
        public readonly string $wrOption,
        public readonly ?string $caName,
        public readonly ?string $mbId
    ) {
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            wrId: (int)($row['wr_id'] ?? 0),
            wrNum: (int)($row['wr_num'] ?? 0),
            wrParent: (int)($row['wr_parent'] ?? 0),
            wrIsComment: (int)($row['wr_is_comment'] ?? 0),
            wrComment: (int)($row['wr_comment'] ?? 0),
            wrCommentReply: (string)($row['wr_comment_reply'] ?? ''),
            wrSubject: (string)($row['wr_subject'] ?? ''),
            wrContent: (string)($row['wr_content'] ?? ''),
            wrName: (string)($row['wr_name'] ?? ''),
            wrEmail: self::nullableString($row['wr_email'] ?? null),
            wrHp: self::nullableString($row['wr_hp'] ?? null),
            wrDatetime: self::normalizeDateTime($row['wr_datetime'] ?? null),
            wrHit: (int)($row['wr_hit'] ?? 0),
            wrGood: (int)($row['wr_good'] ?? 0),
            wrNogood: (int)($row['wr_nogood'] ?? 0),
            wrOption: (string)($row['wr_option'] ?? ''),
            caName: self::nullableString($row['ca_name'] ?? null),
            mbId: self::nullableString($row['mb_id'] ?? null)
        );
    }

    public function isNotice(): bool
    {
        return str_contains($this->wrOption, 'notice');
    }

    public function isSecret(): bool
    {
        return str_contains($this->wrOption, 'secret');
    }

    public function isReply(): bool
    {
        return trim($this->wrCommentReply) !== '';
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return [
            'wr_id' => $this->wrId,
            'wr_num' => $this->wrNum,
            'wr_parent' => $this->wrParent,
            'wr_is_comment' => $this->wrIsComment,
            'wr_comment' => $this->wrComment,
            'wr_comment_reply' => $this->wrCommentReply,
            'wr_subject' => $this->wrSubject,
            'wr_content' => $this->wrContent,
            'wr_name' => $this->wrName,
            'wr_email' => $this->wrEmail,
            'wr_hp' => $this->wrHp,
            'wr_datetime' => $this->wrDatetime,
            'wr_hit' => $this->wrHit,
            'wr_good' => $this->wrGood,
            'wr_nogood' => $this->wrNogood,
            'wr_option' => $this->wrOption,
            'ca_name' => $this->caName,
            'mb_id' => $this->mbId,
        ];
    }

    private static function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = trim((string)$value);
        return $normalized === '' ? null : $normalized;
    }

    private static function normalizeDateTime(mixed $value): ?string
    {
        $normalized = self::nullableString($value);
        if ($normalized === null) {
            return null;
        }

        $timestamp = strtotime($normalized);
        if ($timestamp === false) {
            return $normalized;
        }

        return date(DATE_ATOM, $timestamp);
    }
}
