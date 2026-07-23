<?php

declare(strict_types=1);

namespace Api\Post\Contracts;

interface PostWriteGateway
{
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
    ): int;

    public function updatePost(string $boTable, int $wrId, array $updates): void;

    public function setNotice(string $boTable, int $wrId, bool $isNotice): void;

    public function deletePost(string $boTable, int $wrId): void;

    public function castVote(string $boTable, int $wrId, array $member, string $voteType): array;

    public function increaseHit(string $boTable, int $wrId): void;

    public function createReply(
        string $boTable,
        int $parentWrId,
        array $member,
        string $subject,
        string $content,
        ?string $option,
        string $ip
    ): int;

    public function addScrap(string $memberId, string $boTable, int $wrId): int;

    public function removeScrap(string $memberId, string $boTable, int $wrId): void;

    public function deleteScrapsByPost(string $boTable, int $wrId): void;

    public function updateScrapCount(string $memberId): void;

    public function deleteNewPosts(array $bnIds): void;

    public function increaseLinkHit(string $boTable, int $wrId, int $linkNo): ?string;
}
