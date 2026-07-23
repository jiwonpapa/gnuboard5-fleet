<?php

declare(strict_types=1);

namespace Api\Memo\Repository;

use Api\Core\DTO\CursorPaginatedResult;

final class MemoListQueryRepository extends MemoRepositorySupport
{
    private ?MemoPagedListRepository $pagedRepository = null;

    private ?MemoCursorListRepository $cursorRepository = null;

    private ?MemoDetailQueryRepository $detailRepository = null;

    public function getList(string $memberId, string $kind, int $page, int $perPage): array
    {
        return $this->pagedRepository()->getList($memberId, $kind, $page, $perPage);
    }

    /**
     * @return CursorPaginatedResult<\Api\Core\DTO\MemoItemDTO>
     */
    public function getListByCursor(string $memberId, string $kind, int $perPage, ?string $cursor): CursorPaginatedResult
    {
        return $this->cursorRepository()->getListByCursor($memberId, $kind, $perPage, $cursor);
    }

    public function getById(int $meId, string $memberId, string $kind): ?array
    {
        return $this->detailRepository()->getById($meId, $memberId, $kind);
    }

    public function countUnread(string $memberId): int
    {
        return $this->detailRepository()->countUnread($memberId);
    }

    private function pagedRepository(): MemoPagedListRepository
    {
        if ($this->pagedRepository instanceof MemoPagedListRepository) {
            return $this->pagedRepository;
        }

        return $this->pagedRepository = new MemoPagedListRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }

    private function cursorRepository(): MemoCursorListRepository
    {
        if ($this->cursorRepository instanceof MemoCursorListRepository) {
            return $this->cursorRepository;
        }

        return $this->cursorRepository = new MemoCursorListRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }

    private function detailRepository(): MemoDetailQueryRepository
    {
        if ($this->detailRepository instanceof MemoDetailQueryRepository) {
            return $this->detailRepository;
        }

        return $this->detailRepository = new MemoDetailQueryRepository(
            $this->queryBuilder(),
            $this->tables()
        );
    }
}
