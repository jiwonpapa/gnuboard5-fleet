<?php

/**
 * PointService API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Point\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Point\Service;

use Api\Core\DTO\MemberDTO;
use Api\Core\DTO\PointDTO;
use Api\Point\Contracts\PointQueryGateway;
use Api\Support\Exception\ApiException;

final class PointService
{
    public function __construct(private readonly PointQueryGateway $pointGateway)
    {
    }

    public function getMyPointHistory(array|MemberDTO $member, int $page, int $perPage, ?string $cursor = null): array
    {
        $memberDto = $member instanceof MemberDTO ? $member : MemberDTO::fromRow($member);
        $memberId = trim($memberDto->mbId);
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 토큰이 필요합니다.');
        }

        $safePerPage = max(1, min(100, $perPage));
        $result = trim((string)$cursor) !== ''
            ? $this->pointGateway->getPointHistoryByCursor($memberId, $safePerPage, $cursor)
            : $this->pointGateway->getPointHistory($memberId, $page, $safePerPage);
        $pagination = $result->pagination->jsonSerialize();
        $items = array_map(
            static fn (PointDTO $item): array => (array)$item->jsonSerialize(),
            $result->items
        );

        return [
            'items' => $items,
            'pagination' => $pagination,
        ];
    }
}
