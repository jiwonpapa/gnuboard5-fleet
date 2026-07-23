<?php

declare(strict_types=1);

namespace Api\Post\Service\Support;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\PaginationDTO;

final class PostReadResultBuilder
{
    /**
     * @param array{items?: array<int, array<string, mixed>>, total?: int} $result
     * @return array{
     *     items: array<int, array<string, mixed>>,
     *     pagination: array{page: int, per_page: int, total: int}
     * }
     */
    public function buildListPosts(array $result, int $page, int $perPage): array
    {
        return [
            'items' => $result['items'] ?? [],
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => (int)($result['total'] ?? 0),
            ],
        ];
    }

    /**
     * @param CursorPaginatedResult<mixed> $result
     * @return array{items: array<int, mixed>, pagination: array<string, mixed>}
     */
    public function buildCursorNewPosts(CursorPaginatedResult $result): array
    {
        return [
            'items' => array_map(
                static function (mixed $item): mixed {
                    if ($item instanceof \JsonSerializable) {
                        return $item->jsonSerialize();
                    }

                    return $item;
                },
                $result->items
            ),
            'pagination' => $result->pagination->jsonSerialize(),
        ];
    }

    /**
     * @param array{items?: array<int, array<string, mixed>>, total?: int} $result
     * @return array{items: array<int, array<string, mixed>>, pagination: array<string, mixed>}
     */
    public function buildPagedNewPosts(array $result, int $page, int $perPage): array
    {
        return [
            'items' => $result['items'] ?? [],
            'pagination' => PaginationDTO::create((int)($result['total'] ?? 0), $page, $perPage)->jsonSerialize(),
        ];
    }
}
