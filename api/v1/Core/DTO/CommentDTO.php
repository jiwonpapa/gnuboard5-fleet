<?php

/**
 * 댓글 정보를 캡슐화하는 불변 데이터 전송 객체.
 *
 * @package  Api\Core\DTO
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\DTO;

final class CommentDTO implements \JsonSerializable
{
    public function __construct(
        public readonly int $wrId,
        public readonly int $wrParent,
        public readonly int $wrComment,
        public readonly string $wrCommentReply,
        public readonly string $wrContent,
        public readonly string $wrName,
        public readonly ?string $wrDatetime,
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
            wrParent: (int)($row['wr_parent'] ?? 0),
            wrComment: (int)($row['wr_comment'] ?? 0),
            wrCommentReply: (string)($row['wr_comment_reply'] ?? ''),
            wrContent: (string)($row['wr_content'] ?? ''),
            wrName: (string)($row['wr_name'] ?? ''),
            wrDatetime: self::nullableString($row['wr_datetime'] ?? null),
            mbId: self::nullableString($row['mb_id'] ?? null)
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return [
            'wr_id' => $this->wrId,
            'wr_parent' => $this->wrParent,
            'wr_comment' => $this->wrComment,
            'wr_comment_reply' => $this->wrCommentReply,
            'wr_content' => $this->wrContent,
            'wr_name' => $this->wrName,
            'wr_datetime' => $this->wrDatetime,
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
}
