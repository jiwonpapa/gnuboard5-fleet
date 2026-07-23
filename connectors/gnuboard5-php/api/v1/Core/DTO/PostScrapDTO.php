<?php

/**
 * 게시글 스크랩 목록 항목을 캡슐화하는 불변 DTO.
 *
 * @package  Api\Core\DTO
 * @since    v1.2.0
 */

declare(strict_types=1);

namespace Api\Core\DTO;

final class PostScrapDTO implements \JsonSerializable
{
    public function __construct(
        public readonly int $msId,
        public readonly string $boTable,
        public readonly string $boSubject,
        public readonly int $wrId,
        public readonly string $wrSubject,
        public readonly string $wrName,
        public readonly ?string $wrDatetime,
        public readonly string $mbId,
        public readonly ?string $msDatetime,
        public readonly bool $postExists
    ) {
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            msId: (int)($row['ms_id'] ?? 0),
            boTable: trim((string)($row['bo_table'] ?? '')),
            boSubject: trim((string)($row['bo_subject'] ?? '')),
            wrId: (int)($row['wr_id'] ?? 0),
            wrSubject: trim((string)($row['wr_subject'] ?? '')),
            wrName: trim((string)($row['wr_name'] ?? '')),
            wrDatetime: self::normalizeDateTime($row['wr_datetime'] ?? null),
            mbId: trim((string)($row['mb_id'] ?? '')),
            msDatetime: self::normalizeDateTime($row['ms_datetime'] ?? null),
            postExists: (bool)($row['post_exists'] ?? false)
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return [
            'ms_id' => $this->msId,
            'bo_table' => $this->boTable,
            'bo_subject' => $this->boSubject,
            'wr_id' => $this->wrId,
            'wr_subject' => $this->wrSubject,
            'wr_name' => $this->wrName,
            'wr_datetime' => $this->wrDatetime,
            'mb_id' => $this->mbId,
            'ms_datetime' => $this->msDatetime,
            'post_exists' => $this->postExists,
        ];
    }

    private static function normalizeDateTime(mixed $value): ?string
    {
        $normalized = trim((string)$value);
        if ($normalized === '') {
            return null;
        }

        $timestamp = strtotime($normalized);
        if ($timestamp === false) {
            return $normalized;
        }

        return date(DATE_ATOM, $timestamp);
    }
}
