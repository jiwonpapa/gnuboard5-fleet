<?php

/**
 * BoardRepository API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Board\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Board\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Integration\Contracts\BoardGateway;
use Api\Support\Validation\BoTable;

final class BoardRepository implements BoardGateway
{
    private ?BoardQueryRepository $resolvedQueryRepository = null;

    public function __construct(
        private readonly ?QueryBuilder $qb = null,
        private readonly ?TableRegistry $tables = null,
        ?BoardQueryRepository $queryRepository = null
    ) {
        $this->resolvedQueryRepository = $queryRepository;
    }

    public function findBoard(string $boTable): ?array
    {
        return $this->queryRepository()->findBoard($boTable);
    }

    public function listBoards(?string $groupId, ?int $memberLevel): array
    {
        return $this->queryRepository()->listBoards($groupId, $memberLevel);
    }

    public function exists(string $boTable): bool
    {
        $board = $this->findBoard($boTable);
        return $board !== null;
    }

    public function getWriteTable(string $boTable): string
    {
        return $this->tables()->writeTable(BoTable::normalize($boTable));
    }

    public function getBoardTable(): string
    {
        return $this->tables()->get('board');
    }

    public function isGroupMember(string $groupId, string $memberId): bool
    {
        return $this->queryRepository()->isGroupMember($groupId, $memberId);
    }

    public function getConfig(): array
    {
        return $this->queryRepository()->getConfig();
    }

    private function queryRepository(): BoardQueryRepository
    {
        if ($this->resolvedQueryRepository instanceof BoardQueryRepository) {
            return $this->resolvedQueryRepository;
        }

        $this->resolvedQueryRepository = new BoardQueryRepository($this->qb, $this->tables);

        return $this->resolvedQueryRepository;
    }

    private function tables(): TableRegistry
    {
        return $this->tables instanceof TableRegistry ? $this->tables : new TableRegistry();
    }
}
