<?php

declare(strict_types=1);

namespace Api\Post\Repository;

final class PostNewPostQueryRepository extends PostNewPostRepositoryBase
{
    public function countNewPosts(?string $grId, ?string $view, ?string $mbId): int
    {
        [$where, $params] = $this->buildFilters($grId, $view, $mbId);
        $boardNewTable = $this->tables()->get('board_new');
        $boardTable = $this->boardRepository->getBoardTable();

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$boardNewTable} bn
             INNER JOIN {$boardTable} b
               ON b.bo_table = bn.bo_table
             WHERE {$where}",
            $params
        );

        return (int)($countRow['cnt'] ?? 0);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function getNewPostRows(int $page, int $perPage, ?string $grId, ?string $view, ?string $mbId): array
    {
        $offset = ($page - 1) * $perPage;
        [$where, $params] = $this->buildFilters($grId, $view, $mbId);

        return $this->fetchAllAssociative($this->baseSelectSql($where) . " LIMIT {$perPage} OFFSET {$offset}", $params);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function getNewPostRowsByCursor(int $perPage, ?int $cursorId, ?string $grId, ?string $view, ?string $mbId): array
    {
        [$where, $params] = $this->buildFilters($grId, $view, $mbId);
        if ($cursorId !== null) {
            $where .= ' AND bn.bn_id < :cursor_id';
            $params['cursor_id'] = $cursorId;
        }

        return $this->fetchAllAssociative($this->baseSelectSql($where) . ' LIMIT ' . ($perPage + 1), $params);
    }

    private function baseSelectSql(string $where): string
    {
        $boardNewTable = $this->tables()->get('board_new');
        $boardTable = $this->boardRepository->getBoardTable();
        $groupTable = $this->tables()->get('group');

        return "SELECT
                bn.bn_id,
                bn.bo_table,
                bn.wr_id,
                bn.wr_parent,
                bn.bn_datetime,
                bn.mb_id,
                b.gr_id,
                b.bo_subject,
                g.gr_subject
             FROM {$boardNewTable} bn
             INNER JOIN {$boardTable} b
               ON b.bo_table = bn.bo_table
             LEFT JOIN {$groupTable} g
               ON g.gr_id = b.gr_id
             WHERE {$where}
             ORDER BY bn.bn_id DESC";
    }
}
