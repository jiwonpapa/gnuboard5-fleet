<?php

declare(strict_types=1);

namespace Api\Auth\Service\Support;

use Api\Core\Plugin\EventDispatcher;
use Api\Integration\Contracts\PointRewardGateway;

final readonly class AuthRegistrationPointService
{
    public function __construct(
        private PointRewardGateway $pointGateway,
        private EventDispatcher $events
    ) {
    }

    /**
     * @param array<string, mixed> $memberRow
     */
    public function applyRegisterPoints(array $memberRow): void
    {
        $memberId = trim((string)($memberRow['mb_id'] ?? ''));
        if ($memberId === '') {
            return;
        }

        $registerPoint = (int)($memberRow['_register_point'] ?? 0);
        if ($registerPoint > 0) {
            $this->grantAndDispatch(
                $memberId,
                $registerPoint,
                '회원가입 축하',
                '@member',
                $memberId,
                '회원가입'
            );
        }

        $recommenderId = trim((string)($memberRow['_recommend_member_id'] ?? ''));
        $recommendPoint = (int)($memberRow['_recommend_point'] ?? 0);
        if ($recommenderId === '' || $recommendPoint <= 0) {
            return;
        }

        $this->grantAndDispatch(
            $recommenderId,
            $recommendPoint,
            $memberId . '의 추천인',
            '@member',
            $recommenderId,
            $memberId . ' 추천'
        );
    }

    private function grantAndDispatch(
        string $memberId,
        int $amount,
        string $reason,
        string $relTable,
        string $relId,
        string $action
    ): void {
        if ($amount === 0 || trim($memberId) === '') {
            return;
        }

        $this->pointGateway->grant($memberId, $amount, $reason, $relTable, $relId, $action);
        $this->events->dispatch('point.added', [
            'member_id' => $memberId,
            'amount' => $amount,
            'reason' => $reason,
            'rel_table' => $relTable,
            'rel_id' => $relId,
            'action' => $action,
        ]);
    }
}
