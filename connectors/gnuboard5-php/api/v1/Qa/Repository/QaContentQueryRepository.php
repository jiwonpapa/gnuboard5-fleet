<?php

/**
 * QaContentQueryRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Qa\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Repository;

final class QaContentQueryRepository extends QaRepositorySupport
{
    private ?QaContentHydratorRepository $resolvedHydratorRepository = null;

    public function __construct(
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null,
        ?QaContentHydratorRepository $hydratorRepository = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedHydratorRepository = $hydratorRepository;
    }

    public function getList(
        string $memberId,
        bool $isAdmin,
        int $page,
        int $perPage,
        ?string $category,
        ?string $searchField,
        ?string $searchText
    ): array {
        $table = $this->qaContentTable();
        $conditions = ['qa_type = 0'];
        $params = [];

        if (!$isAdmin) {
            $conditions[] = 'mb_id = :mb_id';
            $params['mb_id'] = $memberId;
        }

        if ($category !== null && $category !== '') {
            $conditions[] = 'qa_category = :qa_category';
            $params['qa_category'] = $category;
        }

        if ($searchText !== null && $searchText !== '') {
            $safeField = $this->normalizeSearchField($searchField);
            $conditions[] = "{$safeField} LIKE :search";
            $params['search'] = '%' . $searchText . '%';
        }

        $where = implode(' AND ', $conditions);
        $page = max(1, $page);
        $perPage = max(1, min(100, $perPage));
        $offset = ($page - 1) * $perPage;

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$table}
             WHERE {$where}",
            $params
        );
        $total = (int)($countRow['cnt'] ?? 0);

        $rows = $this->fetchAllAssociative(
            "SELECT *
             FROM {$table}
             WHERE {$where}
             ORDER BY qa_num ASC
             LIMIT {$perPage} OFFSET {$offset}",
            $params
        );

        $items = array_map(fn (array $row): array => $this->hydratorRepository()->normalizeQaRow($row), $rows);

        return [
            'items' => $items,
            'total' => $total,
        ];
    }

    public function getById(int $qaId, string $memberId, bool $isAdmin): ?array
    {
        $table = $this->qaContentTable();
        $params = ['qa_id' => $qaId];
        $where = 'qa_id = :qa_id';
        if (!$isAdmin) {
            $where .= ' AND mb_id = :mb_id';
            $params['mb_id'] = $memberId;
        }

        $row = $this->fetchAssociative(
            "SELECT *
             FROM {$table}
             WHERE {$where}
             LIMIT 1",
            $params
        );
        if (!is_array($row)) {
            return null;
        }

        return $this->hydratorRepository()->normalizeQaRow($row, true);
    }

    public function getRelatedQuestions(int $qaRelated, int $excludeQaId, int $limit): array
    {
        if ($qaRelated <= 0) {
            return [];
        }

        $safeLimit = max(1, min(100, $limit));
        $rows = $this->fetchAllAssociative(
            "SELECT *
             FROM {$this->qaContentTable()}
             WHERE qa_related = :qa_related
               AND qa_type = 0
               AND qa_id <> :exclude_qa_id
             ORDER BY qa_num ASC
             LIMIT {$safeLimit}",
            [
                'qa_related' => $qaRelated,
                'exclude_qa_id' => $excludeQaId,
            ]
        );

        return array_map(fn (array $row): array => $this->hydratorRepository()->normalizeQaRow($row), $rows);
    }

    public function getFileForDownload(int $qaId, int $fileNo, string $memberId, bool $isAdmin): ?array
    {
        if (!in_array($fileNo, [1, 2], true)) {
            return null;
        }

        $row = $this->fetchAssociative(
            "SELECT qa_id, mb_id, qa_subject, qa_file{$fileNo} AS qa_file, qa_source{$fileNo} AS qa_source
             FROM {$this->qaContentTable()}
             WHERE qa_id = :qa_id
             LIMIT 1",
            ['qa_id' => $qaId]
        );
        if (!is_array($row)) {
            return null;
        }

        if (!$isAdmin && (string)($row['mb_id'] ?? '') !== $memberId) {
            return null;
        }

        $storedName = trim((string)($row['qa_file'] ?? ''));
        if ($storedName === '') {
            return null;
        }

        return [
            'qa_id' => (int)($row['qa_id'] ?? 0),
            'qa_subject' => (string)($row['qa_subject'] ?? ''),
            'file_no' => $fileNo,
            'qa_file' => $storedName,
            'qa_source' => (string)($row['qa_source'] ?? $storedName),
            'path' => $this->dataPath() . '/qa/' . basename($storedName),
        ];
    }

    private function hydratorRepository(): QaContentHydratorRepository
    {
        if ($this->resolvedHydratorRepository instanceof QaContentHydratorRepository) {
            return $this->resolvedHydratorRepository;
        }

        $this->resolvedHydratorRepository = new QaContentHydratorRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedHydratorRepository;
    }
}
