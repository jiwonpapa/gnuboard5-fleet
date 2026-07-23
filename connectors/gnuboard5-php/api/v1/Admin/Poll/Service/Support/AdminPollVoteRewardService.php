<?php

declare(strict_types=1);

namespace Api\Admin\Poll\Service\Support;

use Api\Integration\Contracts\PointRewardGateway;

final class AdminPollVoteRewardService
{
    public function __construct(private readonly PointRewardGateway $pointGateway)
    {
    }

    /**
     * @param array<string, mixed> $poll
     */
    public function grantIfNeeded(array $poll, int $pollId, string $memberId): void
    {
        $point = (int)($poll['po_point'] ?? 0);
        if ($point === 0 || $memberId === '') {
            return;
        }

        $subject = trim((string)($poll['po_subject'] ?? ''));
        $content = $pollId . '. ' . $subject . ' 투표 참여';
        if (!$this->pointGateway->exists($memberId, '@poll', (string)$pollId, '투표')) {
            $this->pointGateway->grant($memberId, $point, $content, '@poll', (string)$pollId, '투표');
        }
    }
}
