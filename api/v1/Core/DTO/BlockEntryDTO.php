<?php

/**
 * 차단 목록 항목을 캡슐화하는 불변 DTO.
 *
 * @package  Api\Core\DTO
 * @since    v1.2.0
 */

declare(strict_types=1);

namespace Api\Core\DTO;

final class BlockEntryDTO implements \JsonSerializable
{
    public function __construct(
        public readonly int $ubId,
        public readonly string $mbId,
        public readonly string $blockedMbId,
        public readonly ?string $ubDatetime
    ) {
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            ubId: (int)($row['ub_id'] ?? 0),
            mbId: trim((string)($row['mb_id'] ?? '')),
            blockedMbId: trim((string)($row['blocked_mb_id'] ?? '')),
            ubDatetime: self::normalizeDateTime($row['ub_datetime'] ?? null)
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return [
            'ub_id' => $this->ubId,
            'mb_id' => $this->mbId,
            'blocked_mb_id' => $this->blockedMbId,
            'ub_datetime' => $this->ubDatetime,
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
