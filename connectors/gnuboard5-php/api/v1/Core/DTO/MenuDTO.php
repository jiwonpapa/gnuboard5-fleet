<?php

/**
 * 메뉴 정보를 캡슐화하는 불변 데이터 전송 객체.
 *
 * @package  Api\Core\DTO
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\DTO;

final class MenuDTO implements \JsonSerializable
{
    public function __construct(
        public readonly int $meId,
        public readonly string $meCode,
        public readonly string $meName,
        public readonly string $meLink,
        public readonly string $meTarget,
        public readonly int $meOrder
    ) {
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            meId: (int)($row['me_id'] ?? 0),
            meCode: (string)($row['me_code'] ?? ''),
            meName: (string)($row['me_name'] ?? ''),
            meLink: (string)($row['me_link'] ?? ''),
            meTarget: (string)($row['me_target'] ?? ''),
            meOrder: (int)($row['me_order'] ?? 0)
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return [
            'me_id' => $this->meId,
            'me_code' => $this->meCode,
            'me_name' => $this->meName,
            'me_link' => $this->meLink,
            'me_target' => $this->meTarget,
            'me_order' => $this->meOrder,
        ];
    }
}
