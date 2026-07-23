<?php

/**
 * CommentRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Comment\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Comment\Repository;

use Api\Comment\Contracts\CommentGateway;
use Api\Integration\Contracts\CommentGateway as LegacyCommentGateway;

final class CommentRepository implements CommentGateway, LegacyCommentGateway
{
    private readonly CommentQueryRepository $queryRepository;
    private readonly CommentMutationRepository $mutationRepository;
    private readonly CommentPointRepository $pointRepository;

    public function __construct(
        CommentQueryRepository $queryRepository,
        CommentMutationRepository $mutationRepository,
        CommentPointRepository $pointRepository
    ) {
        $this->queryRepository = $queryRepository;
        $this->mutationRepository = $mutationRepository;
        $this->pointRepository = $pointRepository;
    }

    public function listComments(string $boTable, int $postId): array
    {
        return $this->queryRepository->listComments($boTable, $postId);
    }

    public function getComment(string $boTable, int $commentId): ?array
    {
        return $this->queryRepository->getComment($boTable, $commentId);
    }

    public function createComment(
        string $boTable,
        int $postId,
        array $member,
        string $content,
        ?int $parentCommentId,
        string $ip
    ): int {
        return $this->mutationRepository->createComment($boTable, $postId, $member, $content, $parentCommentId, $ip);
    }

    public function updateComment(string $boTable, int $commentId, string $content): void
    {
        $this->mutationRepository->updateComment($boTable, $commentId, $content);
    }

    public function deleteComment(string $boTable, int $commentId): void
    {
        $this->mutationRepository->deleteComment($boTable, $commentId);
    }

    public function grantCommentPoint(
        string $memberId,
        string $boTable,
        int $postId,
        int $commentId,
        int $point,
        string $boardSubject
    ): void {
        $this->pointRepository->grantCommentPoint($memberId, $boTable, $postId, $commentId, $point, $boardSubject);
    }

    public function revokeCommentPoint(string $memberId, string $boTable, int $commentId, string $boardSubject, int $point): void
    {
        $this->pointRepository->revokeCommentPoint($memberId, $boTable, $commentId, $boardSubject, $point);
    }

    public function insertBoardNew(string $boTable, int $commentId, int $postId, string $memberId): void
    {
        $this->mutationRepository->insertBoardNew($boTable, $commentId, $postId, $memberId);
    }

    public function deleteBoardNew(string $boTable, int $commentId): void
    {
        $this->mutationRepository->deleteBoardNew($boTable, $commentId);
    }

    public function incrementBoardCommentCount(string $boTable): void
    {
        $this->mutationRepository->incrementBoardCommentCount($boTable);
    }

    public function decrementBoardCommentCount(string $boTable): void
    {
        $this->mutationRepository->decrementBoardCommentCount($boTable);
    }

    public function countChildComments(string $boTable, int $commentId): int
    {
        return $this->queryRepository->countChildComments($boTable, $commentId);
    }

    public function getLastCommentWriteTime(string $boTable, string $memberId): ?string
    {
        return $this->queryRepository->getLastCommentWriteTime($boTable, $memberId);
    }
}
