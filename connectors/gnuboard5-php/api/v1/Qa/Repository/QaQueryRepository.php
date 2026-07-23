<?php

/**
 * QaQueryRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Qa\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class QaQueryRepository extends QaRepositorySupport
{
    private ?QaContentQueryRepository $resolvedContentRepository = null;
    private ?QaConfigRepository $resolvedConfigRepository = null;

    public function __construct(
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null,
        ?QaContentQueryRepository $contentRepository = null,
        ?QaConfigRepository $configRepository = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedContentRepository = $contentRepository;
        $this->resolvedConfigRepository = $configRepository;
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
        return $this->contentRepository()->getList($memberId, $isAdmin, $page, $perPage, $category, $searchField, $searchText);
    }

    public function getById(int $qaId, string $memberId, bool $isAdmin): ?array
    {
        return $this->contentRepository()->getById($qaId, $memberId, $isAdmin);
    }

    public function getRelatedQuestions(int $qaRelated, int $excludeQaId, int $limit): array
    {
        return $this->contentRepository()->getRelatedQuestions($qaRelated, $excludeQaId, $limit);
    }

    public function getFileForDownload(int $qaId, int $fileNo, string $memberId, bool $isAdmin): ?array
    {
        return $this->contentRepository()->getFileForDownload($qaId, $fileNo, $memberId, $isAdmin);
    }

    public function getQaConfig(): array
    {
        return $this->configRepository()->getQaConfig();
    }

    private function contentRepository(): QaContentQueryRepository
    {
        if ($this->resolvedContentRepository instanceof QaContentQueryRepository) {
            return $this->resolvedContentRepository;
        }

        $this->resolvedContentRepository = new QaContentQueryRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedContentRepository;
    }

    private function configRepository(): QaConfigRepository
    {
        if ($this->resolvedConfigRepository instanceof QaConfigRepository) {
            return $this->resolvedConfigRepository;
        }

        $this->resolvedConfigRepository = new QaConfigRepository($this->queryBuilder(), $this->tables());

        return $this->resolvedConfigRepository;
    }
}
