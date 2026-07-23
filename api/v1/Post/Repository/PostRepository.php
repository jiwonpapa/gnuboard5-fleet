<?php

/**
 * PostRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Post\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\Enum\SearchField;
use Api\Integration\Contracts\PostGateway as LegacyPostGateway;
use Api\Post\Contracts\PostGateway;

final class PostRepository implements PostGateway, LegacyPostGateway
{
    private readonly PostQueryRepository $queryRepository;
    private readonly PostMutationRepository $mutationRepository;
    private readonly PostScrapRepository $scrapRepository;
    private readonly PostNewPostRepository $newPostRepository;

    public function __construct(
        PostQueryRepository $queryRepository,
        PostMutationRepository $mutationRepository,
        PostScrapRepository $scrapRepository,
        PostNewPostRepository $newPostRepository
    ) {
        $this->queryRepository = $queryRepository;
        $this->scrapRepository = $scrapRepository;
        $this->newPostRepository = $newPostRepository;
        $this->mutationRepository = $mutationRepository;
    }

    public function listPosts(
        string $boTable,
        int $page,
        int $perPage,
        ?string $category,
        ?string $searchField,
        ?string $search,
        ?string $sort = null
    ): array {
        return $this->queryRepository->listPosts($boTable, $page, $perPage, $category, $searchField, $search, $sort);
    }

    public function getPost(string $boTable, int $wrId): ?array
    {
        return $this->queryRepository->getPost($boTable, $wrId);
    }

    public function createPost(
        string $boTable,
        array $member,
        string $subject,
        string $content,
        ?string $category,
        ?string $option,
        bool $isNotice,
        string $ip,
        ?string $link1 = null,
        ?string $link2 = null
    ): int {
        return $this->mutationRepository->createPost(
            $boTable,
            $member,
            $subject,
            $content,
            $category,
            $option,
            $isNotice,
            $ip,
            $link1,
            $link2
        );
    }

    public function updatePost(string $boTable, int $wrId, array $updates): void
    {
        $this->mutationRepository->updatePost($boTable, $wrId, $updates);
    }

    public function setNotice(string $boTable, int $wrId, bool $isNotice): void
    {
        $this->mutationRepository->setNotice($boTable, $wrId, $isNotice);
    }

    public function deletePost(string $boTable, int $wrId): void
    {
        $this->mutationRepository->deletePost($boTable, $wrId);
    }

    public function listCommentsForPost(string $boTable, int $wrId): array
    {
        return $this->queryRepository->listCommentsForPost($boTable, $wrId);
    }

    public function castVote(string $boTable, int $wrId, array $member, string $voteType): array
    {
        return $this->mutationRepository->castVote($boTable, $wrId, $member, $voteType);
    }

    public function increaseHit(string $boTable, int $wrId): void
    {
        $this->mutationRepository->increaseHit($boTable, $wrId);
    }

    public function createReply(
        string $boTable,
        int $parentWrId,
        array $member,
        string $subject,
        string $content,
        ?string $option,
        string $ip
    ): int {
        return $this->mutationRepository->createReply($boTable, $parentWrId, $member, $subject, $content, $option, $ip);
    }

    public function countReplies(string $boTable, int $wrId): int
    {
        return $this->queryRepository->countReplies($boTable, $wrId);
    }

    public function countOtherMemberComments(string $boTable, int $wrId, string $excludeMbId): int
    {
        return $this->queryRepository->countOtherMemberComments($boTable, $wrId, $excludeMbId);
    }

    public function addScrap(string $memberId, string $boTable, int $wrId): int
    {
        return $this->scrapRepository->addScrap($memberId, $boTable, $wrId);
    }

    public function removeScrap(string $memberId, string $boTable, int $wrId): void
    {
        $this->scrapRepository->removeScrap($memberId, $boTable, $wrId);
    }

    public function isScraped(string $memberId, string $boTable, int $wrId): bool
    {
        return $this->scrapRepository->isScraped($memberId, $boTable, $wrId);
    }

    public function getScrapList(string $memberId, int $page, int $perPage): array
    {
        return $this->scrapRepository->getScrapList($memberId, $page, $perPage);
    }

    /**
     * @return CursorPaginatedResult<\Api\Core\DTO\PostScrapDTO>
     */
    public function getScrapListByCursor(string $memberId, int $perPage, ?string $cursor): CursorPaginatedResult
    {
        return $this->scrapRepository->getScrapListByCursor($memberId, $perPage, $cursor);
    }

    public function deleteScrapsByPost(string $boTable, int $wrId): void
    {
        $this->scrapRepository->deleteScrapsByPost($boTable, $wrId);
    }

    public function updateScrapCount(string $memberId): void
    {
        $this->scrapRepository->updateScrapCount($memberId);
    }

    public function getNewPosts(
        int $page,
        int $perPage,
        ?string $grId,
        ?string $view,
        ?string $mbId
    ): array {
        return $this->newPostRepository->getNewPosts($page, $perPage, $grId, $view, $mbId);
    }

    /**
     * @return CursorPaginatedResult<\Api\Core\DTO\NewPostDTO>
     */
    public function getNewPostsByCursor(
        int $perPage,
        ?string $cursor,
        ?string $grId,
        ?string $view,
        ?string $mbId
    ): CursorPaginatedResult {
        return $this->newPostRepository->getNewPostsByCursor($perPage, $cursor, $grId, $view, $mbId);
    }

    public function findNewPostTargets(array $bnIds): array
    {
        return $this->newPostRepository->findNewPostTargets($bnIds);
    }

    public function deleteNewPosts(array $bnIds): void
    {
        $this->newPostRepository->deleteNewPosts($bnIds);
    }

    public function getLastWriteTime(string $boTable, string $memberId): ?string
    {
        return $this->queryRepository->getLastWriteTime($boTable, $memberId);
    }

    public function increaseLinkHit(string $boTable, int $wrId, int $linkNo): ?string
    {
        return $this->queryRepository->increaseLinkHit($boTable, $wrId, $linkNo);
    }

    public function sanitizeSort(?string $sort): ?string
    {
        return $this->queryRepository->sanitizeSort($sort);
    }

    public function normalizeSearchField(?string $searchField): SearchField
    {
        return $this->queryRepository->normalizeSearchField($searchField);
    }
}
