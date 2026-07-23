<?php

/**
 * BlockService API module.
 *
 * @package  Gnuboard5\Api\v1\Block\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Block\Service;

use Api\Block\Repository\BlockRepository;
use Api\Core\DTO\BlockEntryDTO;
use Api\Core\DTO\PaginationDTO;
use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;

final class BlockService
{
    public function __construct(private readonly BlockRepository $repository)
    {
    }

    /**
     * @return array{items: array<int, array<string, mixed>>, pagination: array<string, mixed>}
     */
    public function listMine(array $member, int $page, int $perPage, ?string $cursor = null): array
    {
        $memberId = $this->requireMemberId($member);
        $safePerPage = max(1, min(100, $perPage));
        if (trim((string)$cursor) !== '') {
            $result = $this->repository->listByMemberCursor($memberId, $safePerPage, $cursor);

            return [
                'items' => array_map(
                    static fn (BlockEntryDTO $item): array => $item->jsonSerialize(),
                    $result->items
                ),
                'pagination' => $result->pagination->jsonSerialize(),
            ];
        }

        $safePage = max(1, $page);
        $result = $this->repository->listByMember($memberId, $safePage, $safePerPage);

        return [
            'items' => $result['items'],
            'pagination' => PaginationDTO::create((int)($result['total'] ?? 0), $safePage, $safePerPage)->jsonSerialize(),
        ];
    }

    public function block(array $member, array $payload): array
    {
        $memberId = $this->requireMemberId($member);
        $blockedMemberId = trim((string)($payload['blocked_mb_id'] ?? ''));
        if ($blockedMemberId === '') {
            throw ApiException::badRequest('blocked_mb_id는 필수입니다.');
        }
        if ($blockedMemberId === $memberId) {
            throw ApiException::badRequest('본인 계정은 차단할 수 없습니다.');
        }

        return $this->repository->create($memberId, $blockedMemberId, G5DateTime::now());
    }

    public function unblock(array $member, string $blockedMemberId): void
    {
        $memberId = $this->requireMemberId($member);
        $targetId = trim($blockedMemberId);
        if ($targetId === '') {
            throw ApiException::badRequest('blocked_mb_id는 필수입니다.');
        }

        $affected = $this->repository->delete($memberId, $targetId);
        if ($affected < 1) {
            throw ApiException::notFound('차단 정보가 없습니다.');
        }
    }

    private function requireMemberId(array $member): string
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 토큰이 필요합니다.');
        }

        return $memberId;
    }
}
