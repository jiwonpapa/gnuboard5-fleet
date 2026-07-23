<?php

/**
 * PostQueryRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Post\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\Enum\SearchField;

final class PostQueryRepository
{
    private readonly PostListQueryRepository $listRepository;
    private readonly PostDetailQueryRepository $detailRepository;

    public function __construct(
        PostListQueryRepository $listRepository,
        PostDetailQueryRepository $detailRepository
    ) {
        $this->listRepository = $listRepository;
        $this->detailRepository = $detailRepository;
    }

    /**
     * @return array{items:array<int,array<string,mixed>>,total:int}
     */
    public function listPosts(
        string $boTable,
        int $page,
        int $perPage,
        ?string $category,
        ?string $searchField,
        ?string $search,
        ?string $sort = null
    ): array {
        return $this->listRepository->listPosts($boTable, $page, $perPage, $category, $searchField, $search, $sort);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getPost(string $boTable, int $wrId): ?array
    {
        return $this->detailRepository->getPost($boTable, $wrId);
    }

    /**
     * @return array<int, array{wr_id:int,mb_id:string}>
     */
    public function listCommentsForPost(string $boTable, int $wrId): array
    {
        return $this->detailRepository->listCommentsForPost($boTable, $wrId);
    }

    public function countReplies(string $boTable, int $wrId): int
    {
        return $this->detailRepository->countReplies($boTable, $wrId);
    }

    public function countOtherMemberComments(string $boTable, int $wrId, string $excludeMbId): int
    {
        return $this->detailRepository->countOtherMemberComments($boTable, $wrId, $excludeMbId);
    }

    public function getLastWriteTime(string $boTable, string $memberId): ?string
    {
        return $this->detailRepository->getLastWriteTime($boTable, $memberId);
    }

    public function increaseLinkHit(string $boTable, int $wrId, int $linkNo): ?string
    {
        return $this->detailRepository->increaseLinkHit($boTable, $wrId, $linkNo);
    }

    public function sanitizeSort(?string $sort): ?string
    {
        return $this->listRepository->sanitizeSort($sort);
    }

    public function normalizeSearchField(?string $searchField): SearchField
    {
        return $this->listRepository->normalizeSearchField($searchField);
    }
}
