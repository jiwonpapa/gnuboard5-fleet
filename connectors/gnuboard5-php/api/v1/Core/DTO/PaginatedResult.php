<?php

/**
 * 페이징 결과를 캡슐화하는 불변 DTO.
 *
 * @package  Api\Core\DTO
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\DTO;

/**
 * @template T of mixed
 */
final class PaginatedResult implements \JsonSerializable
{
    /**
     * @var array<int, T>
     */
    public readonly array $items;

    public readonly PaginationDTO $pagination;

    /**
     * @param array<int, T> $items
     */
    public function __construct(array $items, PaginationDTO $pagination)
    {
        $this->items = $items;
        $this->pagination = $pagination;
    }

    /**
     * @return array{data: array<int, mixed>, pagination: array<string, mixed>}
     */
    public function jsonSerialize(): array
    {
        $normalizedItems = array_map(
            static function (mixed $item): mixed {
                if ($item instanceof \JsonSerializable) {
                    return $item->jsonSerialize();
                }

                return $item;
            },
            $this->items
        );

        return [
            'data' => $normalizedItems,
            'pagination' => $this->pagination->jsonSerialize(),
        ];
    }
}
