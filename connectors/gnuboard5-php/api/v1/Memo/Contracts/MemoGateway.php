<?php

declare(strict_types=1);

namespace Api\Memo\Contracts;

use Api\Core\DTO\CursorPaginatedResult;

interface MemoGateway
{
    public function getList(string $memberId, string $kind, int $page, int $perPage): array;

    /**
     * @return CursorPaginatedResult<\Api\Core\DTO\MemoItemDTO>
     */
    public function getListByCursor(string $memberId, string $kind, int $perPage, ?string $cursor): CursorPaginatedResult;

    public function getById(int $meId, string $memberId, string $kind): ?array;

    public function send(string $sendMbId, string $recvMbId, string $memo, string $ip): int;

    public function markAsRead(int $meId, string $memberId): void;

    public function countUnread(string $memberId): int;

    public function delete(int $meId, string $memberId): ?array;

    public function updateMemoCount(string $memberId): void;

    public function updateMemoCall(string $recvMbId, string $sendMbId): void;

    public function clearMemoCall(string $recvMbId, string $sendMbId): void;

    public function validateRecipient(string $recvMbId, bool $isAdmin): array;

    public function getMemoSendPoint(): int;
}
