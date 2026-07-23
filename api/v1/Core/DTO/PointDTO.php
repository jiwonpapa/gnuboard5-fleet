<?php

/**
 * 포인트 정보를 캡슐화하는 불변 데이터 전송 객체.
 *
 * @package  Api\Core\DTO
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\DTO;

final class PointDTO implements \JsonSerializable
{
    public function __construct(
        public readonly int $poId,
        public readonly string $mbId,
        public readonly string $poContent,
        public readonly int $poPoint,
        public readonly int $poUsePoint,
        public readonly string $poExpireDate,
        public readonly string $poDatetime
    ) {
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            poId: (int)($row['po_id'] ?? 0),
            mbId: (string)($row['mb_id'] ?? ''),
            poContent: (string)($row['po_content'] ?? ''),
            poPoint: (int)($row['po_point'] ?? 0),
            poUsePoint: (int)($row['po_use_point'] ?? 0),
            poExpireDate: (string)($row['po_expire_date'] ?? ''),
            poDatetime: self::normalizeDateTime((string)($row['po_datetime'] ?? ''))
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return [
            'po_id' => $this->poId,
            'mb_id' => $this->mbId,
            'po_content' => $this->poContent,
            'po_point' => $this->poPoint,
            'po_use_point' => $this->poUsePoint,
            'po_expire_date' => $this->poExpireDate,
            'po_datetime' => $this->poDatetime,
        ];
    }

    private static function normalizeDateTime(string $value): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return '';
        }

        $timestamp = strtotime($trimmed);
        if ($timestamp === false) {
            return $trimmed;
        }

        return date(DATE_ATOM, $timestamp);
    }
}
