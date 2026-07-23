<?php

/**
 * BoardGateway API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Integration\Contracts
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Integration\Contracts;

interface BoardGateway
{
    public function findBoard(string $boTable): ?array;
    public function listBoards(?string $groupId, ?int $memberLevel): array;
    public function exists(string $boTable): bool;
    public function getWriteTable(string $boTable): string;
    public function getBoardTable(): string;
    public function isGroupMember(string $groupId, string $memberId): bool;
    public function getConfig(): array;
}
