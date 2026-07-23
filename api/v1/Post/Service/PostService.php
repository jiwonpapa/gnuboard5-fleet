<?php

declare(strict_types=1);

namespace Api\Post\Service;

use Api\Board\Service\BoardService;
use Api\Core\Plugin\EventDispatcher;
use Api\Integration\Contracts\BoardGateway;
use Api\Post\Contracts\PostGateway;

final class PostService
{
    private readonly PostReadService $readService;
    private readonly PostMutationService $mutationService;
    private readonly PostDeleteService $deleteService;
    private readonly PostScrapService $scrapService;

    public function __construct(
        PostGateway $postGateway,
        BoardService $boardService,
        BoardGateway $boardGateway,
        EventDispatcher $events,
        PostPermissionService $permissionService,
        PostPointService $pointService,
        PostReadService $readService,
        PostMutationService $mutationService,
        PostDeleteService $deleteService,
        PostScrapService $scrapService
    ) {
        self::touchDependencies(
            $postGateway,
            $boardService,
            $boardGateway,
            $events,
            $permissionService,
            $pointService
        );
        $this->readService = $readService;
        $this->mutationService = $mutationService;
        $this->deleteService = $deleteService;
        $this->scrapService = $scrapService;
    }

    public function listPosts(
        string $boTable,
        int $page,
        int $perPage,
        ?string $category,
        ?string $searchField,
        ?string $search,
        ?string $sort,
        array $member = []
    ): array {
        return $this->readService->listPosts($boTable, $page, $perPage, $category, $searchField, $search, $sort, $member);
    }

    public function getPost(string $boTable, int $wrId, array $member = []): array
    {
        return $this->readService->getPost($boTable, $wrId, $member);
    }

    public function createPost(string $boTable, array $member, array $payload, string $ip): int
    {
        return $this->mutationService->createPost($boTable, $member, $payload, $ip);
    }

    public function updatePost(string $boTable, int $wrId, array $member, array $payload): void
    {
        $this->mutationService->updatePost($boTable, $wrId, $member, $payload);
    }

    public function deletePost(string $boTable, int $wrId, array $member): void
    {
        $this->deleteService->deletePost($boTable, $wrId, $member);
    }

    public function addScrap(string $boTable, int $wrId, array $member): array
    {
        return $this->scrapService->addScrap($boTable, $wrId, $member);
    }

    public function removeScrap(string $boTable, int $wrId, array $member): void
    {
        $this->scrapService->removeScrap($boTable, $wrId, $member);
    }

    public function listMyScraps(array $member, int $page, int $perPage, ?string $cursor = null): array
    {
        return $this->scrapService->listMyScraps($member, $page, $perPage, $cursor);
    }

    public function listNewPosts(array $query, array $member = []): array
    {
        return $this->readService->listNewPosts($query, $member);
    }

    public function deleteNewPosts(array $member, array $bnIds): array
    {
        return $this->deleteService->deleteNewPosts($member, $bnIds);
    }

    public function votePost(string $boTable, int $wrId, array $member, array $payload): array
    {
        return $this->readService->votePost($boTable, $wrId, $member, $payload);
    }

    public function increaseHit(string $boTable, int $wrId): void
    {
        $this->readService->increaseHit($boTable, $wrId);
    }

    public function createReply(string $boTable, int $wrId, array $member, array $payload, string $ip): int
    {
        return $this->mutationService->createReply($boTable, $wrId, $member, $payload, $ip);
    }

    public function openLink(string $boTable, int $wrId, int $linkNo, array $member = []): string
    {
        return $this->readService->openLink($boTable, $wrId, $linkNo, $member);
    }

    private static function touchDependencies(mixed ...$dependencies): void
    {
    }
}
