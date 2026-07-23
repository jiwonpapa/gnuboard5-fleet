<?php

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\DTO\CursorPaginatedResult;
use Api\Core\DTO\CursorPaginationDTO;
use Api\Core\DTO\PostScrapDTO;
use Api\Support\Pagination\CursorCodec;

final class PostScrapQueryRepository extends PostRepositorySupport
{
    private ?PostScrapHydratorRepository $resolvedHydratorRepository = null;

    public function __construct(
        \Api\Integration\Contracts\BoardGateway $boardRepository,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null,
        ?PostScrapHydratorRepository $hydratorRepository = null
    ) {
        parent::__construct($boardRepository, $qb, $tables);
        $this->resolvedHydratorRepository = $hydratorRepository;
    }

    /**
     * @return array{items:array<int,array<string,mixed>>,total:int}
     */
    public function getScrapList(string $memberId, int $page, int $perPage): array
    {
        $scrapTable = $this->tables()->get('scrap');
        $boardTable = $this->boardRepository->getBoardTable();
        $memberId = trim($memberId);
        $page = max(1, $page);
        $perPage = max(1, min(100, $perPage));
        $offset = ($page - 1) * $perPage;

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$scrapTable}
             WHERE mb_id = :mb_id",
            ['mb_id' => $memberId]
        );
        $total = (int)($countRow['cnt'] ?? 0);

        $rows = $this->fetchAllAssociative(
            "SELECT
                s.ms_id,
                s.bo_table,
                s.wr_id,
                s.ms_datetime,
                b.bo_subject
             FROM {$scrapTable} s
             LEFT JOIN {$boardTable} b
               ON b.bo_table = s.bo_table
             WHERE s.mb_id = :mb_id
             ORDER BY s.ms_id DESC
             LIMIT {$perPage} OFFSET {$offset}",
            ['mb_id' => $memberId]
        );

        return [
            'items' => array_map(
                static fn (PostScrapDTO $item): array => $item->jsonSerialize(),
                $this->hydratorRepository()->hydrateScrapItems($rows)
            ),
            'total' => $total,
        ];
    }

    /**
     * @return CursorPaginatedResult<PostScrapDTO>
     */
    public function getScrapListByCursor(string $memberId, int $perPage, ?string $cursor): CursorPaginatedResult
    {
        $scrapTable = $this->tables()->get('scrap');
        $boardTable = $this->boardRepository->getBoardTable();
        $memberId = trim($memberId);
        $safePerPage = max(1, min(100, $perPage));
        $cursorId = CursorCodec::decode($cursor, 'post.scrap');
        $params = ['mb_id' => $memberId];
        $where = 's.mb_id = :mb_id';

        if ($cursorId !== null) {
            $where .= ' AND s.ms_id < :cursor_id';
            $params['cursor_id'] = $cursorId;
        }

        $rows = $this->fetchAllAssociative(
            "SELECT
                s.ms_id,
                s.bo_table,
                s.wr_id,
                s.ms_datetime,
                b.bo_subject
             FROM {$scrapTable} s
             LEFT JOIN {$boardTable} b
               ON b.bo_table = s.bo_table
             WHERE {$where}
             ORDER BY s.ms_id DESC
             LIMIT " . ($safePerPage + 1),
            $params
        );

        $hasNext = count($rows) > $safePerPage;
        if ($hasNext) {
            array_pop($rows);
        }

        $items = $this->hydratorRepository()->hydrateScrapItems($rows);
        $lastItem = $items === [] ? null : $items[array_key_last($items)];
        $nextCursor = $lastItem instanceof PostScrapDTO ? CursorCodec::encode('post.scrap', $lastItem->msId) : null;

        return new CursorPaginatedResult(
            items: $items,
            pagination: CursorPaginationDTO::create($safePerPage, $cursor, $hasNext ? $nextCursor : null, $hasNext)
        );
    }

    private function hydratorRepository(): PostScrapHydratorRepository
    {
        if ($this->resolvedHydratorRepository instanceof PostScrapHydratorRepository) {
            return $this->resolvedHydratorRepository;
        }

        $this->resolvedHydratorRepository = new PostScrapHydratorRepository(
            $this->boardRepository,
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->resolvedHydratorRepository;
    }
}
