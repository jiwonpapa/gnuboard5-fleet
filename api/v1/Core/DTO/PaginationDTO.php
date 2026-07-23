<?php

/**
 * 페이징 메타 정보를 캡슐화하는 불변 데이터 전송 객체.
 *
 * @package  Api\Core\DTO
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\DTO;

final class PaginationDTO implements \JsonSerializable
{
    public function __construct(
        public readonly int $total,
        public readonly int $page,
        public readonly int $perPage,
        public readonly int $lastPage,
        public readonly bool $hasNext,
        public readonly bool $hasPrev
    ) {
    }

    public static function create(int $total, int $page, int $perPage): self
    {
        $safePerPage = max(1, $perPage);
        $safePage = max(1, $page);
        $lastPage = max(1, (int)ceil($total / $safePerPage));

        return new self(
            total: max(0, $total),
            page: $safePage,
            perPage: $safePerPage,
            lastPage: $lastPage,
            hasNext: $safePage < $lastPage,
            hasPrev: $safePage > 1
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return [
            'total' => $this->total,
            'page' => $this->page,
            'per_page' => $this->perPage,
            'last_page' => $this->lastPage,
            'has_next' => $this->hasNext,
            'has_prev' => $this->hasPrev,
        ];
    }
}
