<?php

/**
 * PostGatewayProxy API module.
 *
 * @package  Gnuboard5\Api\v1\Core\Plugin\Gateway
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\Plugin\Gateway;

use Api\Core\Plugin\PluginScopeViolationException;
use Api\Integration\Contracts\PostGateway;

final class PostGatewayProxy implements PostGateway
{
    public function __construct(
        private readonly PostGateway $gateway,
        private readonly string $pluginId,
        private readonly bool $canWrite
    ) {
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
        return $this->gateway->listPosts($boTable, $page, $perPage, $category, $searchField, $search, $sort);
    }

    public function getPost(string $boTable, int $wrId): ?array
    {
        return $this->gateway->getPost($boTable, $wrId);
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
        $this->assertCanWrite(__FUNCTION__);

        return $this->gateway->createPost(
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
        $this->assertCanWrite(__FUNCTION__);
        $this->gateway->updatePost($boTable, $wrId, $updates);
    }

    public function setNotice(string $boTable, int $wrId, bool $isNotice): void
    {
        $this->assertCanWrite(__FUNCTION__);
        $this->gateway->setNotice($boTable, $wrId, $isNotice);
    }

    public function deletePost(string $boTable, int $wrId): void
    {
        $this->assertCanWrite(__FUNCTION__);
        $this->gateway->deletePost($boTable, $wrId);
    }

    public function listCommentsForPost(string $boTable, int $wrId): array
    {
        return $this->gateway->listCommentsForPost($boTable, $wrId);
    }

    public function castVote(string $boTable, int $wrId, array $member, string $voteType): array
    {
        $this->assertCanWrite(__FUNCTION__);

        return $this->gateway->castVote($boTable, $wrId, $member, $voteType);
    }

    public function increaseHit(string $boTable, int $wrId): void
    {
        $this->assertCanWrite(__FUNCTION__);
        $this->gateway->increaseHit($boTable, $wrId);
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
        $this->assertCanWrite(__FUNCTION__);

        return $this->gateway->createReply($boTable, $parentWrId, $member, $subject, $content, $option, $ip);
    }

    public function countReplies(string $boTable, int $wrId): int
    {
        return $this->gateway->countReplies($boTable, $wrId);
    }

    public function countOtherMemberComments(string $boTable, int $wrId, string $excludeMbId): int
    {
        return $this->gateway->countOtherMemberComments($boTable, $wrId, $excludeMbId);
    }

    public function addScrap(string $memberId, string $boTable, int $wrId): int
    {
        $this->assertCanWrite(__FUNCTION__);

        return $this->gateway->addScrap($memberId, $boTable, $wrId);
    }

    public function removeScrap(string $memberId, string $boTable, int $wrId): void
    {
        $this->assertCanWrite(__FUNCTION__);
        $this->gateway->removeScrap($memberId, $boTable, $wrId);
    }

    public function isScraped(string $memberId, string $boTable, int $wrId): bool
    {
        return $this->gateway->isScraped($memberId, $boTable, $wrId);
    }

    public function getScrapList(string $memberId, int $page, int $perPage): array
    {
        return $this->gateway->getScrapList($memberId, $page, $perPage);
    }

    /**
     * @return \Api\Core\DTO\CursorPaginatedResult<\Api\Core\DTO\PostScrapDTO>
     */
    public function getScrapListByCursor(string $memberId, int $perPage, ?string $cursor): \Api\Core\DTO\CursorPaginatedResult
    {
        return $this->gateway->getScrapListByCursor($memberId, $perPage, $cursor);
    }

    public function deleteScrapsByPost(string $boTable, int $wrId): void
    {
        $this->assertCanWrite(__FUNCTION__);
        $this->gateway->deleteScrapsByPost($boTable, $wrId);
    }

    public function updateScrapCount(string $memberId): void
    {
        $this->assertCanWrite(__FUNCTION__);
        $this->gateway->updateScrapCount($memberId);
    }

    public function getNewPosts(
        int $page,
        int $perPage,
        ?string $grId,
        ?string $view,
        ?string $mbId
    ): array {
        return $this->gateway->getNewPosts($page, $perPage, $grId, $view, $mbId);
    }

    /**
     * @return \Api\Core\DTO\CursorPaginatedResult<\Api\Core\DTO\NewPostDTO>
     */
    public function getNewPostsByCursor(
        int $perPage,
        ?string $cursor,
        ?string $grId,
        ?string $view,
        ?string $mbId
    ): \Api\Core\DTO\CursorPaginatedResult {
        return $this->gateway->getNewPostsByCursor($perPage, $cursor, $grId, $view, $mbId);
    }

    public function findNewPostTargets(array $bnIds): array
    {
        return $this->gateway->findNewPostTargets($bnIds);
    }

    public function deleteNewPosts(array $bnIds): void
    {
        $this->assertCanWrite(__FUNCTION__);
        $this->gateway->deleteNewPosts($bnIds);
    }

    public function getLastWriteTime(string $boTable, string $memberId): ?string
    {
        return $this->gateway->getLastWriteTime($boTable, $memberId);
    }

    public function increaseLinkHit(string $boTable, int $wrId, int $linkNo): ?string
    {
        $this->assertCanWrite(__FUNCTION__);

        return $this->gateway->increaseLinkHit($boTable, $wrId, $linkNo);
    }

    private function assertCanWrite(string $method): void
    {
        if ($this->canWrite) {
            return;
        }

        throw PluginScopeViolationException::forMethod(
            $this->pluginId,
            PostGateway::class,
            $method,
            'post.write'
        );
    }
}
