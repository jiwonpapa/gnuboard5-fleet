<?php

/**
 * MemoRepository API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Memo\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Memo\Repository;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Integration\Contracts\MemoGateway as LegacyMemoGateway;
use Api\Memo\Contracts\MemoGateway;

final class MemoRepository implements MemoGateway, LegacyMemoGateway
{
    private readonly MemoQueryRepository $queryRepository;
    private readonly MemoMutationRepository $mutationRepository;

    public function __construct(
        MemoQueryRepository $queryRepository,
        MemoMutationRepository $mutationRepository
    ) {
        $this->queryRepository = $queryRepository;
        $this->mutationRepository = $mutationRepository;
    }

    public function getList(string $memberId, string $kind, int $page, int $perPage): array
    {
        return $this->queryRepository->getList($memberId, $kind, $page, $perPage);
    }

    /**
     * @return CursorPaginatedResult<\Api\Core\DTO\MemoItemDTO>
     */
    public function getListByCursor(string $memberId, string $kind, int $perPage, ?string $cursor): CursorPaginatedResult
    {
        return $this->queryRepository->getListByCursor($memberId, $kind, $perPage, $cursor);
    }

    public function getById(int $meId, string $memberId, string $kind): ?array
    {
        return $this->queryRepository->getById($meId, $memberId, $kind);
    }

    public function send(string $sendMbId, string $recvMbId, string $memo, string $ip): int
    {
        return $this->mutationRepository->send($sendMbId, $recvMbId, $memo, $ip);
    }

    public function markAsRead(int $meId, string $memberId): void
    {
        $this->mutationRepository->markAsRead($meId, $memberId);
    }

    public function countUnread(string $memberId): int
    {
        return $this->queryRepository->countUnread($memberId);
    }

    public function delete(int $meId, string $memberId): ?array
    {
        return $this->mutationRepository->delete($meId, $memberId);
    }

    public function updateMemoCount(string $memberId): void
    {
        $this->mutationRepository->updateMemoCount($memberId);
    }

    public function updateMemoCall(string $recvMbId, string $sendMbId): void
    {
        $this->mutationRepository->updateMemoCall($recvMbId, $sendMbId);
    }

    public function clearMemoCall(string $recvMbId, string $sendMbId): void
    {
        $this->mutationRepository->clearMemoCall($recvMbId, $sendMbId);
    }

    public function validateRecipient(string $recvMbId, bool $isAdmin): array
    {
        return $this->queryRepository->validateRecipient($recvMbId, $isAdmin);
    }

    public function getMemoSendPoint(): int
    {
        return $this->queryRepository->getMemoSendPoint();
    }
}
