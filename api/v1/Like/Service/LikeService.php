<?php

/**
 * LikeService API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Like\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Like\Service;

use Api\Board\Service\BoardService;
use Api\Core\DTO\MemberDTO;
use Api\Core\Enum\VoteType;
use Api\Like\Contracts\LikeGateway;
use Api\Support\Exception\ApiException;

final class LikeService
{
    public function __construct(
        private readonly LikeGateway $likeGateway,
        private readonly BoardService $boardService
    ) {
    }

    public function vote(string $boTable, int $wrId, array|MemberDTO $member, array $payload): array
    {
        $unknown = array_values(array_diff(array_keys($payload), ['type']));
        if ($unknown !== []) {
            throw ApiException::badRequest('추천 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown));
        }
        $memberDto = $member instanceof MemberDTO ? $member : MemberDTO::fromRow($member);
        $memberId = trim($memberDto->mbId);
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 사용자 정보가 없습니다.');
        }

        if (!$this->boardService->isMemberAllowedForRead($memberDto->jsonSerialize(), $boTable)) {
            throw ApiException::forbidden('해당 게시판 조회 권한이 없습니다.');
        }

        $rawType = strtolower(trim((string)($payload['type'] ?? '')));
        if (!in_array($rawType, ['good', 'nogood'], true)) {
            throw ApiException::badRequest('type은 good 또는 nogood입니다.');
        }
        $type = VoteType::tryFrom($rawType);
        if (!$type instanceof VoteType) {
            throw ApiException::badRequest('type은 good 또는 nogood입니다.');
        }

        $result = $this->likeGateway->castVote($boTable, $wrId, $memberId, $type);

        return [
            'wr_good' => (int)($result['wr_good'] ?? 0),
            'wr_nogood' => (int)($result['wr_nogood'] ?? 0),
        ];
    }
}
