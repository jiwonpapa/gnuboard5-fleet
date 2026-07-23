<?php

/**
 * AdminPollVoteService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Poll\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Poll\Service;

use Api\Admin\Poll\Repository\AdminPollRepository;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Admin\Poll\Service\Support\AdminPollVoteInputNormalizer;
use Api\Admin\Poll\Service\Support\AdminPollVoteRewardService;
use Api\Admin\Poll\Service\Support\AdminPollVoteTracker;
use Api\Support\Exception\ApiException;

final class AdminPollVoteService
{
    private ?AdminPollVoteInputNormalizer $resolvedInputNormalizer = null;
    private ?AdminPollVoteTracker $resolvedTracker = null;
    private ?AdminPollVoteRewardService $resolvedRewardService = null;

    public function __construct(
        private readonly AdminPollRepository $repository,
        private readonly PointRewardGateway $pointGateway,
        private readonly AdminPollResultService $resultService,
        ?AdminPollVoteInputNormalizer $inputNormalizer = null,
        ?AdminPollVoteTracker $tracker = null,
        ?AdminPollVoteRewardService $rewardService = null
    ) {
        $this->resolvedInputNormalizer = $inputNormalizer;
        $this->resolvedTracker = $tracker;
        $this->resolvedRewardService = $rewardService;
    }

    /**
     * @param array<string,mixed> $member
     * @return array<string,mixed>
     */
    public function active(array $member): array
    {
        $poll = $this->repository->findActive();
        if ($poll === null) {
            return [
                'active' => false,
                'can_vote' => false,
                'poll' => null,
            ];
        }

        $level = $this->inputs()->memberLevel($member);
        $requiredLevel = (int)($poll['po_level'] ?? 1);

        return [
            'active' => true,
            'can_vote' => $level >= $requiredLevel,
            'poll' => $this->resultService->buildFromPoll($poll, false),
        ];
    }

    /**
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $member
     * @return array<string,mixed>
     */
    public function vote(int $pollId, array $payload, array $member, string $ip): array
    {
        $input = $this->inputs()->normalizePayload($payload);
        $id = $this->inputs()->requirePollId($pollId);
        $poll = $this->repository->find($id);
        if ($poll === null) {
            throw ApiException::notFound('투표를 찾을 수 없습니다.');
        }
        if ((int)($poll['po_use'] ?? 0) !== 1) {
            throw ApiException::forbidden('현재 참여할 수 없는 투표입니다.');
        }

        $memberLevel = $this->inputs()->memberLevel($member);
        $requiredLevel = max(1, (int)($poll['po_level'] ?? 1));
        if ($memberLevel < $requiredLevel) {
            if ($this->inputs()->memberId($member) === '') {
                throw ApiException::unauthorized('로그인이 필요합니다.');
            }

            throw ApiException::forbidden('권한 레벨이 부족합니다.');
        }

        $pollNo = $input['poll_no'];
        $choiceText = trim((string)($poll['po_poll' . $pollNo] ?? ''));
        if ($choiceText === '') {
            throw ApiException::badRequest('선택한 항목이 존재하지 않습니다.');
        }

        $memberId = $this->inputs()->memberId($member);
        $currentIps = (string)($poll['po_ips'] ?? '');
        $currentMembers = (string)($poll['mb_ids'] ?? '');

        if ($ip !== '' && $this->tracker()->contains($currentIps, $ip)) {
            throw ApiException::conflict('이미 투표에 참여했습니다.');
        }
        if ($memberId !== '' && $this->tracker()->contains($currentMembers, $memberId)) {
            throw ApiException::conflict('이미 투표에 참여했습니다.');
        }

        $updatedIps = $this->tracker()->append($currentIps, $ip);
        $updatedMembers = $this->tracker()->append($currentMembers, $memberId);
        $this->repository->recordVote($id, $pollNo, $updatedIps, $updatedMembers);

        $idea = $input['po_etc_text'];
        if (trim((string)($poll['po_etc'] ?? '')) !== '' && $idea !== '') {
            $name = $this->inputs()->voterName($member, $memberId);
            $this->repository->addEtcIdea($id, $memberId, $name, $idea);
        }

        $this->rewardService()->grantIfNeeded($poll, $id, $memberId);

        return [
            'voted' => true,
            'po_id' => $id,
            'poll_no' => $pollNo,
            'choice' => $choiceText,
        ];
    }

    private function inputs(): AdminPollVoteInputNormalizer
    {
        return $this->resolvedInputNormalizer ??= new AdminPollVoteInputNormalizer();
    }

    private function tracker(): AdminPollVoteTracker
    {
        return $this->resolvedTracker ??= new AdminPollVoteTracker();
    }

    private function rewardService(): AdminPollVoteRewardService
    {
        if ($this->resolvedRewardService instanceof AdminPollVoteRewardService) {
            return $this->resolvedRewardService;
        }

        $this->resolvedRewardService = new AdminPollVoteRewardService($this->pointGateway);

        return $this->resolvedRewardService;
    }
}
