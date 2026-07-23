<?php

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\CursorPaginationDTO;
use Api\Core\DTO\NewPostDTO;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Support\Pagination\CursorCodec;
use Api\Integration\Contracts\BoardGateway;

final class PostNewPostListRepository extends PostNewPostRepositoryBase
{
    private ?PostNewPostQueryRepository $resolvedQueryRepository = null;
    private ?PostNewPostHydratorRepository $resolvedHydratorRepository = null;

    public function __construct(
        BoardGateway $boardRepository,
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?PostNewPostQueryRepository $queryRepository = null,
        ?PostNewPostHydratorRepository $hydratorRepository = null
    ) {
        parent::__construct($boardRepository, $qb, $tables);
        $this->resolvedQueryRepository = $queryRepository;
        $this->resolvedHydratorRepository = $hydratorRepository;
    }

    /**
     * @return array{items:array<int,array<string,mixed>>,total:int}
     */
    public function getNewPosts(
        int $page,
        int $perPage,
        ?string $grId,
        ?string $view,
        ?string $mbId
    ): array {
        $page = max(1, $page);
        $perPage = max(1, min(100, $perPage));
        $total = $this->queryRepository()->countNewPosts($grId, $view, $mbId);
        $rows = $this->queryRepository()->getNewPostRows($page, $perPage, $grId, $view, $mbId);

        return [
            'items' => array_map(
                fn (array $row): array => NewPostDTO::fromRow($this->hydratorRepository()->hydrateNewPostItem($row))->jsonSerialize(),
                $rows
            ),
            'total' => $total,
        ];
    }

    /**
     * @return CursorPaginatedResult<NewPostDTO>
     */
    public function getNewPostsByCursor(
        int $perPage,
        ?string $cursor,
        ?string $grId,
        ?string $view,
        ?string $mbId
    ): CursorPaginatedResult {
        $safePerPage = max(1, min(100, $perPage));
        $cursorType = $this->buildCursorType($grId, $view, $mbId);
        $cursorId = CursorCodec::decode($cursor, $cursorType);
        $rows = $this->queryRepository()->getNewPostRowsByCursor($safePerPage, $cursorId, $grId, $view, $mbId);

        $hasNext = count($rows) > $safePerPage;
        if ($hasNext) {
            array_pop($rows);
        }

        $items = array_map(
            fn (array $row): NewPostDTO => NewPostDTO::fromRow($this->hydratorRepository()->hydrateNewPostItem($row)),
            $rows
        );
        $lastItem = $items === [] ? null : $items[array_key_last($items)];
        $nextCursor = $lastItem instanceof NewPostDTO ? CursorCodec::encode($cursorType, $lastItem->bnId) : null;

        return new CursorPaginatedResult(
            items: $items,
            pagination: CursorPaginationDTO::create($safePerPage, $cursor, $hasNext ? $nextCursor : null, $hasNext)
        );
    }

    private function queryRepository(): PostNewPostQueryRepository
    {
        if ($this->resolvedQueryRepository instanceof PostNewPostQueryRepository) {
            return $this->resolvedQueryRepository;
        }

        $this->resolvedQueryRepository = new PostNewPostQueryRepository(
            $this->boardRepository,
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->resolvedQueryRepository;
    }

    private function hydratorRepository(): PostNewPostHydratorRepository
    {
        if ($this->resolvedHydratorRepository instanceof PostNewPostHydratorRepository) {
            return $this->resolvedHydratorRepository;
        }

        $this->resolvedHydratorRepository = new PostNewPostHydratorRepository(
            $this->boardRepository,
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->resolvedHydratorRepository;
    }
}
