<?php

/**
 * AdminFaqService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Faq\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Faq\Service;

use Api\Admin\Faq\Repository\AdminFaqRepository;
use Api\Admin\Faq\Service\Support\AdminFaqInputNormalizer;
use Api\Admin\Faq\Service\Support\AdminFaqPaginationBuilder;
use Api\Admin\Faq\Service\Support\AdminFaqPresenter;
use Api\Support\Exception\ApiException;

final class AdminFaqService
{
    private ?AdminFaqInputNormalizer $resolvedInputNormalizer = null;
    private ?AdminFaqPaginationBuilder $resolvedPaginationBuilder = null;
    private ?AdminFaqPresenter $resolvedPresenter = null;

    public function __construct(
        private readonly AdminFaqRepository $repository,
        private readonly AdminFaqMasterService $masterService,
        ?AdminFaqInputNormalizer $inputNormalizer = null,
        ?AdminFaqPaginationBuilder $paginationBuilder = null
    ) {
        $this->resolvedInputNormalizer = $inputNormalizer;
        $this->resolvedPaginationBuilder = $paginationBuilder;
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function list(array $query): array
    {
        $normalized = $this->inputs()->normalizeListQuery($query);
        $page = $normalized['page'];
        $perPage = $normalized['per_page'];
        $fmId = $normalized['fm_id'];

        $result = $this->repository->list($page, $perPage, $fmId);
        $total = $result['total'];

        return [
            'items' => array_map(
                fn (array $item): array => $this->presenter()->present($item),
                $result['items']
            ),
            'pagination' => $this->paginationBuilder()->build($page, $perPage, $total),
        ];
    }

    public function detail(int $faqId): array
    {
        $this->inputs()->assertFaqId($faqId);
        $faq = $this->repository->find($faqId);
        if ($faq === null) {
            throw ApiException::notFound('FAQ를 찾을 수 없습니다.');
        }

        return $this->presenter()->present($faq);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(array $payload): array
    {
        $normalized = $this->inputs()->normalizeCreatePayload($payload);
        $masterId = $normalized['fm_id'];
        if (!$this->repository->existsMaster($masterId)) {
            throw ApiException::badRequest('유효한 fm_id가 필요합니다.');
        }

        $faqId = $this->repository->create($normalized);
        $created = $this->repository->find($faqId);
        if ($created === null) {
            throw ApiException::serverError('FAQ 생성 후 조회에 실패했습니다.');
        }

        return $this->presenter()->present($created);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(int $faqId, array $payload): array
    {
        $this->inputs()->assertFaqId($faqId);
        $existing = $this->repository->find($faqId);
        if (!is_array($existing)) {
            throw ApiException::notFound('FAQ를 찾을 수 없습니다.');
        }

        $normalized = $this->inputs()->normalizeUpdatePayload($payload);
        if (isset($normalized['fm_id']) && !$this->repository->existsMaster((int)$normalized['fm_id'])) {
            throw ApiException::badRequest('유효한 fm_id가 필요합니다.');
        }

        $affected = $this->repository->update($faqId, $normalized);
        if ($affected <= 0) {
            throw ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $updated = $this->repository->find($faqId);

        return $this->presenter()->present(is_array($updated) ? $updated : $existing);
    }

    public function delete(int $faqId): void
    {
        $this->inputs()->assertFaqId($faqId);
        if ($this->repository->delete($faqId) <= 0) {
            throw ApiException::notFound('FAQ를 찾을 수 없습니다.');
        }
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listMasters(array $query): array
    {
        return $this->masterService->list($query);
    }

    public function detailMaster(int $masterId): array
    {
        return $this->masterService->detail($masterId);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function createMaster(array $payload): array
    {
        return $this->masterService->create($payload);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function updateMaster(int $masterId, array $payload): array
    {
        return $this->masterService->update($masterId, $payload);
    }

    public function deleteMaster(int $masterId): void
    {
        $this->masterService->delete($masterId);
    }

    public function uploadMasterHeaderImage(int $masterId, ?\Psr\Http\Message\UploadedFileInterface $uploadedFile): array
    {
        return $this->masterService->uploadHeaderImage($masterId, $uploadedFile);
    }

    public function deleteMasterHeaderImage(int $masterId): array
    {
        return $this->masterService->deleteHeaderImage($masterId);
    }

    public function uploadMasterFooterImage(int $masterId, ?\Psr\Http\Message\UploadedFileInterface $uploadedFile): array
    {
        return $this->masterService->uploadFooterImage($masterId, $uploadedFile);
    }

    public function deleteMasterFooterImage(int $masterId): array
    {
        return $this->masterService->deleteFooterImage($masterId);
    }

    private function inputs(): AdminFaqInputNormalizer
    {
        return $this->resolvedInputNormalizer ??= new AdminFaqInputNormalizer();
    }

    private function paginationBuilder(): AdminFaqPaginationBuilder
    {
        return $this->resolvedPaginationBuilder ??= new AdminFaqPaginationBuilder();
    }

    private function presenter(): AdminFaqPresenter
    {
        return $this->resolvedPresenter ??= new AdminFaqPresenter();
    }
}
