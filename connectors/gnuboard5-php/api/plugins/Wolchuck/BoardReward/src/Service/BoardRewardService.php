<?php

/**
 * BoardRewardService API module.
 *
 * @package  Gnuboard5\Api\Plugins\Wolchuck\BoardReward\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Plugins\Wolchuck\BoardReward\Service;

use Api\Core\Config\EnvConfig;
use Api\Integration\Contracts\BoardGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Support\Exception\ApiException;

final class BoardRewardService
{
    public function __construct(
        private readonly BoardGateway $boardGateway,
        private readonly PointRewardGateway $pointGateway,
        private readonly EnvConfig $envConfig
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function getBoardSummary(string $boardId): array
    {
        $board = $this->requireBoard($boardId);

        return [
            'plugin' => 'board-reward',
            'board' => [
                'bo_table' => (string)($board['bo_table'] ?? $boardId),
                'subject' => (string)($board['bo_subject'] ?? ''),
                'group_id' => (string)($board['gr_id'] ?? ''),
            ],
            'scopes' => ['board.read', 'point.write'],
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function previewReward(array $payload): array
    {
        $command = $this->normalizeRewardPayload($payload);

        return [
            'plugin' => 'board-reward',
            'mode' => 'preview',
            'grant_enabled' => $this->isGrantEnabled(),
            'reward' => $command,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function grantReward(array $payload): array
    {
        if (!$this->isGrantEnabled()) {
            throw ApiException::forbidden('보상 지급 샘플 엔드포인트는 PLUGIN_BOARD_REWARD_ENABLE_GRANT=1 설정 시에만 동작합니다.');
        }

        $command = $this->normalizeRewardPayload($payload);
        $this->pointGateway->grant(
            $command['member_id'],
            $command['amount'],
            $command['reason'],
            'plugin_board_reward',
            $command['rel_id'],
            'grant',
            null
        );

        return [
            'plugin' => 'board-reward',
            'mode' => 'grant',
            'status' => 'granted',
            'reward' => $command,
        ];
    }

    private function isGrantEnabled(): bool
    {
        return $this->envConfig->pluginBoardRewardEnableGrant;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{board_id:string,member_id:string,amount:int,reason:string,rel_id:string}
     */
    private function normalizeRewardPayload(array $payload): array
    {
        $boardId = trim((string)($payload['board_id'] ?? ''));
        $memberId = trim((string)($payload['member_id'] ?? ''));
        $amount = (int)($payload['amount'] ?? 0);
        $reason = trim((string)($payload['reason'] ?? ''));
        $relId = trim((string)($payload['rel_id'] ?? ''));

        if ($boardId === '') {
            throw ApiException::badRequest('board_id는 필수입니다.');
        }
        if ($memberId === '') {
            throw ApiException::badRequest('member_id는 필수입니다.');
        }
        if ($amount <= 0) {
            throw ApiException::badRequest('amount는 1 이상의 정수여야 합니다.');
        }
        if ($reason === '') {
            throw ApiException::badRequest('reason은 필수입니다.');
        }

        $this->requireBoard($boardId);

        return [
            'board_id' => $boardId,
            'member_id' => $memberId,
            'amount' => $amount,
            'reason' => $reason,
            'rel_id' => $relId !== '' ? $relId : sprintf('%s:%s:%d', $boardId, $memberId, $amount),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function requireBoard(string $boardId): array
    {
        if ($boardId === '') {
            throw ApiException::badRequest('bo_table은 필수입니다.');
        }

        $board = $this->boardGateway->findBoard($boardId);
        if ($board === null) {
            throw ApiException::notFound('게시판을 찾을 수 없습니다.');
        }

        return $board;
    }
}
