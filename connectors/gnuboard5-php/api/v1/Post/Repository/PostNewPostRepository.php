<?php

/**
 * PostNewPostRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Post\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\NewPostDTO;

final class PostNewPostRepository
{
    private readonly PostNewPostListRepository $listRepository;
    private readonly PostNewPostMutationRepository $mutationRepository;

    public function __construct(
        PostNewPostListRepository $listRepository,
        PostNewPostMutationRepository $mutationRepository
    ) {
        $this->listRepository = $listRepository;
        $this->mutationRepository = $mutationRepository;
    }

    /**
     * @return array{items:array<int,array<string,mixed>>,total:int}
     */
    public function getNewPosts(
        int $page,
        int $perPage,
        ?string $grId,
        ?string $view,
        ?string $mbId
    ): array {
        return $this->listRepository->getNewPosts($page, $perPage, $grId, $view, $mbId);
    }

    /**
     * @return CursorPaginatedResult<NewPostDTO>
     */
    public function getNewPostsByCursor(
        int $perPage,
        ?string $cursor,
        ?string $grId,
        ?string $view,
        ?string $mbId
    ): CursorPaginatedResult {
        return $this->listRepository->getNewPostsByCursor($perPage, $cursor, $grId, $view, $mbId);
    }

    /**
     * @param array<int, mixed> $bnIds
     * @return array<int, array<string,mixed>>
     */
    public function findNewPostTargets(array $bnIds): array
    {
        return $this->mutationRepository->findNewPostTargets($bnIds);
    }

    /**
     * @param array<int, mixed> $bnIds
     */
    public function deleteNewPosts(array $bnIds): void
    {
        $this->mutationRepository->deleteNewPosts($bnIds);
    }
}
