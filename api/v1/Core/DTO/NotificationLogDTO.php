<?php

/**
 * 알림 로그 목록 항목을 캡슐화하는 불변 DTO.
 *
 * @package  Api\Core\DTO
 * @since    v1.2.0
 */

declare(strict_types=1);

namespace Api\Core\DTO;

final class NotificationLogDTO implements \JsonSerializable
{
    public function __construct(
        public readonly int $plId,
        public readonly string $mbId,
        public readonly string $plTitle,
        public readonly string $plBody,
        public readonly string $plType,
        public readonly string $plStatus,
        public readonly ?string $plDatetime
    ) {
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            plId: (int)($row['pl_id'] ?? 0),
            mbId: trim((string)($row['mb_id'] ?? '')),
            plTitle: trim((string)($row['pl_title'] ?? '')),
            plBody: trim((string)($row['pl_body'] ?? '')),
            plType: trim((string)($row['pl_type'] ?? '')),
            plStatus: trim((string)($row['pl_status'] ?? '')),
            plDatetime: self::normalizeDateTime($row['pl_datetime'] ?? null)
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return [
            'pl_id' => $this->plId,
            'mb_id' => $this->mbId,
            'pl_title' => $this->plTitle,
            'pl_body' => $this->plBody,
            'pl_type' => $this->plType,
            'pl_status' => $this->plStatus,
            'pl_datetime' => $this->plDatetime,
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
