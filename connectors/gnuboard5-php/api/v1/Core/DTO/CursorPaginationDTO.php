<?php

/**
 * 커서 기반 페이징 메타 정보를 캡슐화하는 불변 데이터 전송 객체.
 *
 * @package  Api\Core\DTO
 * @since    v1.2.0
 */

declare(strict_types=1);

namespace Api\Core\DTO;

final class CursorPaginationDTO implements \JsonSerializable
{
    public function __construct(
        public readonly int $perPage,
        public readonly ?string $cursor,
        public readonly ?string $nextCursor,
        public readonly bool $hasNext
    ) {
    }

    public static function create(int $perPage, ?string $cursor, ?string $nextCursor, bool $hasNext): self
    {
        return new self(
            perPage: max(1, $perPage),
            cursor: self::normalizeCursor($cursor),
            nextCursor: self::normalizeCursor($nextCursor),
            hasNext: $hasNext
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return [
            'mode' => 'cursor',
            'per_page' => $this->perPage,
            'cursor' => $this->cursor,
            'next_cursor' => $this->nextCursor,
            'has_next' => $this->hasNext,
        ];
    }

    private static function normalizeCursor(?string $cursor): ?string
    {
        $normalized = trim((string)$cursor);

        return $normalized === '' ? null : $normalized;
    }
}
