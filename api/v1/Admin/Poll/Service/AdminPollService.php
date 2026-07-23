<?php

/**
 * AdminPollService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Poll\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Poll\Service;

final class AdminPollService
{
    public function __construct(
        private readonly AdminPollManageService $manageService,
        private readonly AdminPollVoteService $voteService
    ) {
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listAdmin(array $member, array $query): array
    {
        return $this->manageService->listAdmin($member, $query);
    }

    /**
     * @param array<string,mixed> $member
     */
    public function detailAdmin(array $member, int $pollId): array
    {
        return $this->manageService->detailAdmin($member, $pollId);
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $payload
     */
    public function createAdmin(array $member, array $payload): array
    {
        return $this->manageService->createAdmin($member, $payload);
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $payload
     */
    public function updateAdmin(int $pollId, array $member, array $payload): array
    {
        return $this->manageService->updateAdmin($pollId, $member, $payload);
    }

    /**
     * @param array<string,mixed> $member
     */
    public function deleteAdmin(int $pollId, array $member): void
    {
        $this->manageService->deleteAdmin($pollId, $member);
    }

    /**
     * @param array<string,mixed> $member
     * @return array<string,mixed>
     */
    public function active(array $member): array
    {
        return $this->voteService->active($member);
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $member
     * @return array<string,mixed>
     */
    public function vote(int $pollId, array $payload, array $member, string $ip): array
    {
        return $this->voteService->vote($pollId, $payload, $member, $ip);
    }

    /**
     * @return array<string,mixed>
     */
    public function result(int $pollId, bool $includeEtc = true): array
    {
        return $this->manageService->result($pollId, $includeEtc);
    }
}
