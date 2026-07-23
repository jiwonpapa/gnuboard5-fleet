<?php

declare(strict_types=1);

namespace Api\Post\Contracts;

use Api\Core\DTO\CursorPaginatedResult;

interface PostReadGateway
{
    public function listPosts(
        string $boTable,
        int $page,
        int $perPage,
        ?string $category,
        ?string $searchField,
        ?string $search,
        ?string $sort = null
    ): array;

    public function getPost(string $boTable, int $wrId): ?array;

    /**
     * @return array<int, array{wr_id:int,mb_id:string}>
     */
    public function listCommentsForPost(string $boTable, int $wrId): array;

    public function countReplies(string $boTable, int $wrId): int;

    public function countOtherMemberComments(string $boTable, int $wrId, string $excludeMbId): int;

    public function isScraped(string $memberId, string $boTable, int $wrId): bool;

    public function getScrapList(string $memberId, int $page, int $perPage): array;

    /**
     * @return CursorPaginatedResult<\Api\Core\DTO\PostScrapDTO>
     */
    public function getScrapListByCursor(string $memberId, int $perPage, ?string $cursor): CursorPaginatedResult;

    public function getNewPosts(
        int $page,
        int $perPage,
        ?string $grId,
        ?string $view,
        ?string $mbId
    ): array;

    /**
     * @return CursorPaginatedResult<\Api\Core\DTO\NewPostDTO>
     */
    public function getNewPostsByCursor(
        int $perPage,
        ?string $cursor,
        ?string $grId,
        ?string $view,
        ?string $mbId
    ): CursorPaginatedResult;

    public function findNewPostTargets(array $bnIds): array;

    public function getLastWriteTime(string $boTable, string $memberId): ?string;
}
