<?php

declare(strict_types=1);

namespace Api\Qa\Contracts;

interface QaGateway
{
    public function getList(
        string $memberId,
        bool $isAdmin,
        int $page,
        int $perPage,
        ?string $category,
        ?string $searchField,
        ?string $searchText
    ): array;

    public function getById(int $qaId, string $memberId, bool $isAdmin): ?array;

    public function createQuestion(array $data): int;

    public function createAnswer(int $parentQaId, array $data): int;

    public function createRelatedQuestion(int $relatedQaId, array $data): int;

    public function update(int $qaId, array $data): void;

    public function delete(int $qaId, string $memberId, bool $isAdmin): void;

    public function bulkDelete(array $qaIds): void;

    public function getRelatedQuestions(int $qaRelated, int $excludeQaId, int $limit): array;

    public function getFileForDownload(int $qaId, int $fileNo, string $memberId, bool $isAdmin): ?array;

    public function getQaConfig(): array;
}
