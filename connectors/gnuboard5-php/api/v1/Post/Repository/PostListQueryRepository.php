<?php

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\Enum\SearchField;
use Api\Support\Exception\ApiException;

final class PostListQueryRepository extends PostQuerySupport
{
    /**
     * @return array{items:array<int,array<string,mixed>>,total:int}
     */
    public function listPosts(
        string $boTable,
        int $page,
        int $perPage,
        ?string $category,
        ?string $searchField,
        ?string $search,
        ?string $sort = null
    ): array {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $board = $this->boardRepository->findBoard($boTable) ?? [];
        $noticeIds = $this->parseNoticeIds((string)($board['bo_notice'] ?? ''));
        $noticeMap = array_flip($noticeIds);

        $safePage = max(1, $page);
        $safePerPage = max(1, min(100, $perPage));
        $offset = ($safePage - 1) * $safePerPage;

        $conditions = ['wr_is_comment = 0'];
        $params = [];
        if ($category !== null && $category !== '') {
            $conditions[] = 'ca_name = :ca_name';
            $params['ca_name'] = $category;
        }

        if ($search !== null && $search !== '') {
            $safeField = $this->normalizeSearchField($searchField);
            if ($safeField === SearchField::TitleContent) {
                $conditions[] = '(wr_subject LIKE :search_subject OR wr_content LIKE :search_content)';
                $params['search_subject'] = '%' . $search . '%';
                $params['search_content'] = '%' . $search . '%';
            } else {
                $column = match ($safeField) {
                    SearchField::Title => 'wr_subject',
                    SearchField::Content => 'wr_content',
                    SearchField::Author => 'wr_name',
                    SearchField::Comment => 'wr_content',
                };
                $conditions[] = "{$column} LIKE :search";
                $params['search'] = '%' . $search . '%';
            }
        }

        $where = implode(' AND ', $conditions);
        $orderBase = $this->sanitizeSort($sort) ?? 'wr_id DESC';
        $orderPrefix = $noticeIds === []
            ? ''
            : 'CASE WHEN wr_id IN (' . implode(',', $noticeIds) . ') THEN 0 ELSE 1 END ASC, ';
        $order = $orderPrefix . $orderBase;

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$writeTable} WHERE {$where}",
            $params
        );
        $total = (int)($countRow['cnt'] ?? 0);

        $rows = $this->fetchAllAssociative(
            "SELECT
                wr_id,
                wr_parent,
                wr_subject,
                wr_content,
                wr_name,
                mb_id,
                wr_datetime,
                wr_hit,
                wr_good,
                wr_nogood,
                wr_comment,
                ca_name,
                wr_option
             FROM {$writeTable}
             WHERE {$where}
             ORDER BY {$order}
             LIMIT {$safePerPage} OFFSET {$offset}",
            $params
        );

        $items = array_map(fn (array $row): array => $this->normalizePostRow($row), $rows);
        foreach ($items as &$item) {
            $item['is_notice'] = isset($noticeMap[(int)($item['wr_id'] ?? 0)]);
        }
        unset($item);

        return [
            'items' => $items,
            'total' => $total,
        ];
    }

    public function sanitizeSort(?string $sort): ?string
    {
        if ($sort === null || trim($sort) === '') {
            return null;
        }

        $safeFields = ['wr_id', 'wr_datetime', 'wr_hit', 'wr_good', 'wr_nogood', 'wr_comment'];
        $orders = [];

        foreach (array_filter(array_map('trim', explode(',', $sort)), static fn (string $field): bool => $field !== '') as $field) {
            $direction = 'ASC';
            $column = $field;
            if (str_starts_with($field, '-')) {
                $direction = 'DESC';
                $column = substr($field, 1);
            }

            if (!in_array($column, $safeFields, true)) {
                throw ApiException::badRequest("허용되지 않은 정렬 항목: {$column}");
            }

            $orders[] = "{$column} {$direction}";
        }

        return $orders === [] ? null : implode(', ', $orders);
    }

    public function normalizeSearchField(?string $searchField): SearchField
    {
        return match ($searchField) {
            SearchField::Title->value => SearchField::Title,
            SearchField::Content->value => SearchField::Content,
            SearchField::Author->value => SearchField::Author,
            SearchField::Comment->value => SearchField::Comment,
            default => SearchField::TitleContent,
        };
    }
}
