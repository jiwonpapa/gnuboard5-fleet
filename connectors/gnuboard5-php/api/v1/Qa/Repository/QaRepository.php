<?php

/**
 * QaRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Qa\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Qa\Repository;

use Api\Integration\Contracts\QaGateway as LegacyQaGateway;
use Api\Qa\Contracts\QaGateway;

final class QaRepository implements QaGateway, LegacyQaGateway
{
    private readonly QaQueryRepository $queryRepository;
    private readonly QaMutationRepository $mutationRepository;

    public function __construct(
        QaQueryRepository $queryRepository,
        QaMutationRepository $mutationRepository
    ) {
        $this->queryRepository = $queryRepository;
        $this->mutationRepository = $mutationRepository;
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
        return $this->queryRepository->getList($memberId, $isAdmin, $page, $perPage, $category, $searchField, $searchText);
    }

    public function getById(int $qaId, string $memberId, bool $isAdmin): ?array
    {
        return $this->queryRepository->getById($qaId, $memberId, $isAdmin);
    }

    public function createQuestion(array $data): int
    {
        return $this->mutationRepository->createQuestion($data);
    }

    public function createAnswer(int $parentQaId, array $data): int
    {
        return $this->mutationRepository->createAnswer($parentQaId, $data);
    }

    public function createRelatedQuestion(int $relatedQaId, array $data): int
    {
        return $this->mutationRepository->createRelatedQuestion($relatedQaId, $data);
    }

    public function update(int $qaId, array $data): void
    {
        $this->mutationRepository->update($qaId, $data);
    }

    public function delete(int $qaId, string $memberId, bool $isAdmin): void
    {
        $this->mutationRepository->delete($qaId, $memberId, $isAdmin);
    }

    public function bulkDelete(array $qaIds): void
    {
        $this->mutationRepository->bulkDelete($qaIds);
    }

    public function getRelatedQuestions(int $qaRelated, int $excludeQaId, int $limit): array
    {
        return $this->queryRepository->getRelatedQuestions($qaRelated, $excludeQaId, $limit);
    }

    public function getFileForDownload(int $qaId, int $fileNo, string $memberId, bool $isAdmin): ?array
    {
        return $this->queryRepository->getFileForDownload($qaId, $fileNo, $memberId, $isAdmin);
    }

    public function getQaConfig(): array
    {
        return $this->queryRepository->getQaConfig();
    }
}
