<?php

/**
 * 쪽지 목록 항목을 캡슐화하는 불변 DTO.
 *
 * @package  Api\Core\DTO
 * @since    v1.2.0
 */

declare(strict_types=1);

namespace Api\Core\DTO;

final class MemoItemDTO implements \JsonSerializable
{
    public function __construct(
        public readonly int $meId,
        public readonly string $meRecvMbId,
        public readonly string $meSendMbId,
        public readonly ?string $meSendDatetime,
        public readonly ?string $meReadDatetime,
        public readonly string $meMemo,
        public readonly int $meSendId,
        public readonly string $meType,
        public readonly string $meSendIp,
        public readonly string $counterpartMbId,
        public readonly string $counterpartMbNick
    ) {
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            meId: (int)($row['me_id'] ?? 0),
            meRecvMbId: trim((string)($row['me_recv_mb_id'] ?? '')),
            meSendMbId: trim((string)($row['me_send_mb_id'] ?? '')),
            meSendDatetime: self::normalizeDateTime($row['me_send_datetime'] ?? null),
            meReadDatetime: self::normalizeDateTime($row['me_read_datetime'] ?? null),
            meMemo: (string)($row['me_memo'] ?? ''),
            meSendId: (int)($row['me_send_id'] ?? 0),
            meType: trim((string)($row['me_type'] ?? '')),
            meSendIp: trim((string)($row['me_send_ip'] ?? '')),
            counterpartMbId: trim((string)($row['counterpart_mb_id'] ?? '')),
            counterpartMbNick: trim((string)($row['counterpart_mb_nick'] ?? ''))
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return [
            'me_id' => $this->meId,
            'me_recv_mb_id' => $this->meRecvMbId,
            'me_send_mb_id' => $this->meSendMbId,
            'me_send_datetime' => $this->meSendDatetime,
            'me_read_datetime' => $this->meReadDatetime,
            'me_memo' => $this->meMemo,
            'me_send_id' => $this->meSendId,
            'me_type' => $this->meType,
            'me_send_ip' => $this->meSendIp,
            'counterpart_mb_id' => $this->counterpartMbId,
            'counterpart_mb_nick' => $this->counterpartMbNick,
        ];
    }

    private static function normalizeDateTime(mixed $value): ?string
    {
        $normalized = trim((string)$value);
        if ($normalized === '' || str_starts_with($normalized, '0000-00-00')) {
            return null;
        }

        $timestamp = strtotime($normalized);
        if ($timestamp === false) {
            return $normalized;
        }

        return date(DATE_ATOM, $timestamp);
    }
}
