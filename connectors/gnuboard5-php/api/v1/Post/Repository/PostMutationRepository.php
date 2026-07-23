<?php

/**
 * PostMutationRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Post\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Post\Repository;

final class PostMutationRepository
{
    private readonly PostWriteRepository $writeRepository;
    private readonly PostNoticeRepository $noticeRepository;
    private readonly PostReactionRepository $reactionRepository;

    public function __construct(
        PostWriteRepository $writeRepository,
        PostNoticeRepository $noticeRepository,
        PostReactionRepository $reactionRepository
    ) {
        $this->noticeRepository = $noticeRepository;
        $this->writeRepository = $writeRepository;
        $this->reactionRepository = $reactionRepository;
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
        return $this->writeRepository->createPost(
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
        $this->writeRepository->updatePost($boTable, $wrId, $updates);
    }

    public function setNotice(string $boTable, int $wrId, bool $isNotice): void
    {
        $this->noticeRepository->setNotice($boTable, $wrId, $isNotice);
    }

    public function deletePost(string $boTable, int $wrId): void
    {
        $this->noticeRepository->deletePost($boTable, $wrId);
    }

    /**
     * @param array<string,mixed> $member
     * @return array{wr_good:int,wr_nogood:int}
     */
    public function castVote(string $boTable, int $wrId, array $member, string $voteType): array
    {
        return $this->reactionRepository->castVote($boTable, $wrId, $member, $voteType);
    }

    public function increaseHit(string $boTable, int $wrId): void
    {
        $this->reactionRepository->increaseHit($boTable, $wrId);
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
        return $this->writeRepository->createReply($boTable, $parentWrId, $member, $subject, $content, $option, $ip);
    }
}
