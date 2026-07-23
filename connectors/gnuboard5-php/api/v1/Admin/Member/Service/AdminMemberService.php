<?php

/**
 * AdminMemberService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Member\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Member\Service;

use Psr\Http\Message\UploadedFileInterface;

final class AdminMemberService
{
    public function __construct(
        private readonly AdminMemberQueryService $queryService,
        private readonly AdminMemberMutationService $mutationService
    ) {
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function list(array $query): array
    {
        return $this->queryService->list($query);
    }

    public function detail(string $memberId): array
    {
        return $this->queryService->detail($memberId);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(string $memberId, array $payload, array $actor = []): array
    {
        return $this->mutationService->update($memberId, $payload, $actor);
    }

    public function updateLevel(string $memberId, int $level, array $actor = []): array
    {
        return $this->mutationService->updateLevel($memberId, $level, $actor);
    }

    public function delete(string $memberId, array $actor = []): void
    {
        $this->mutationService->delete($memberId, $actor);
    }

    /**
     * @param array<string,mixed> $query
     * @return array<int,array<string,mixed>>
     */
    public function exportExcel(array $query): array
    {
        return $this->queryService->exportExcel($query);
    }

    public function uploadIcon(string $memberId, ?UploadedFileInterface $uploadedFile): array
    {
        return $this->mutationService->uploadIcon($memberId, $uploadedFile);
    }

    public function deleteIcon(string $memberId): array
    {
        return $this->mutationService->deleteIcon($memberId);
    }

    public function uploadImage(string $memberId, ?UploadedFileInterface $uploadedFile): array
    {
        return $this->mutationService->uploadImage($memberId, $uploadedFile);
    }

    public function deleteImage(string $memberId): array
    {
        return $this->mutationService->deleteImage($memberId);
    }
}
