<?php

declare(strict_types=1);

namespace Api\Comment\Contracts;

interface CommentGateway
{
    public function listComments(string $boTable, int $postId): array;
    public function getComment(string $boTable, int $commentId): ?array;
    public function createComment(
        string $boTable,
        int $postId,
        array $member,
        string $content,
        ?int $parentCommentId,
        string $ip
    ): int;
    public function updateComment(string $boTable, int $commentId, string $content): void;
    public function deleteComment(string $boTable, int $commentId): void;
    public function grantCommentPoint(string $memberId, string $boTable, int $postId, int $commentId, int $point, string $boardSubject): void;
    public function revokeCommentPoint(string $memberId, string $boTable, int $commentId, string $boardSubject, int $point): void;
    public function insertBoardNew(string $boTable, int $commentId, int $postId, string $memberId): void;
    public function deleteBoardNew(string $boTable, int $commentId): void;
    public function incrementBoardCommentCount(string $boTable): void;
    public function decrementBoardCommentCount(string $boTable): void;
    public function countChildComments(string $boTable, int $commentId): int;
    public function getLastCommentWriteTime(string $boTable, string $memberId): ?string;
}
