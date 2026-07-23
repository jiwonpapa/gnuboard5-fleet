<?php

/**
 * 새글 목록 항목을 캡슐화하는 불변 DTO.
 *
 * @package  Api\Core\DTO
 * @since    v1.2.0
 */

declare(strict_types=1);

namespace Api\Core\DTO;

final class NewPostDTO implements \JsonSerializable
{
    public function __construct(
        public readonly int $bnId,
        public readonly string $boTable,
        public readonly string $boSubject,
        public readonly string $grId,
        public readonly string $grSubject,
        public readonly int $wrId,
        public readonly int $wrParent,
        public readonly ?string $bnDatetime,
        public readonly string $mbId,
        public readonly string $viewType,
        public readonly string $wrSubject,
        public readonly string $wrName,
        public readonly ?string $wrDatetime,
        public readonly string $postMbId,
        public readonly string $parentWrSubject,
        public readonly bool $postExists
    ) {
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            bnId: (int)($row['bn_id'] ?? 0),
            boTable: trim((string)($row['bo_table'] ?? '')),
            boSubject: trim((string)($row['bo_subject'] ?? '')),
            grId: trim((string)($row['gr_id'] ?? '')),
            grSubject: trim((string)($row['gr_subject'] ?? '')),
            wrId: (int)($row['wr_id'] ?? 0),
            wrParent: (int)($row['wr_parent'] ?? 0),
            bnDatetime: self::normalizeDateTime($row['bn_datetime'] ?? null),
            mbId: trim((string)($row['mb_id'] ?? '')),
            viewType: trim((string)($row['view_type'] ?? '')),
            wrSubject: trim((string)($row['wr_subject'] ?? '')),
            wrName: trim((string)($row['wr_name'] ?? '')),
            wrDatetime: self::normalizeDateTime($row['wr_datetime'] ?? null),
            postMbId: trim((string)($row['post_mb_id'] ?? '')),
            parentWrSubject: trim((string)($row['parent_wr_subject'] ?? '')),
            postExists: (bool)($row['post_exists'] ?? false)
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return [
            'bn_id' => $this->bnId,
            'bo_table' => $this->boTable,
            'bo_subject' => $this->boSubject,
            'gr_id' => $this->grId,
            'gr_subject' => $this->grSubject,
            'wr_id' => $this->wrId,
            'wr_parent' => $this->wrParent,
            'bn_datetime' => $this->bnDatetime,
            'mb_id' => $this->mbId,
            'view_type' => $this->viewType,
            'wr_subject' => $this->wrSubject,
            'wr_name' => $this->wrName,
            'wr_datetime' => $this->wrDatetime,
            'post_mb_id' => $this->postMbId,
            'parent_wr_subject' => $this->parentWrSubject,
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
