<?php

/**
 * AdminContentService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Content\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Content\Service;

use Api\Admin\Content\Repository\AdminContentRepository;
use Api\Admin\Content\Service\Support\AdminContentPayloadNormalizer;
use Api\Admin\Content\Service\Support\AdminContentPresenter;
use Api\Support\Exception\ApiException;

final class AdminContentService
{
    private ?AdminContentPayloadNormalizer $resolvedPayloadNormalizer = null;
    private ?AdminContentPresenter $resolvedPresenter = null;

    public function __construct(private readonly AdminContentRepository $repository)
    {
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function list(array $query): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(100, max(1, (int)($query['per_page'] ?? 20)));
        $search = isset($query['search']) ? (string)$query['search'] : null;

        $result = $this->repository->list($page, $perPage, $search);
        $total = $result['total'];

        return [
            'items' => array_map(
                fn (array $item): array => $this->presenter()->present($item),
                $result['items']
            ),
            'pagination' => $this->buildPagination($page, $perPage, $total),
        ];
    }

    public function detail(string $contentId): array
    {
        $content = $this->repository->find($this->payloadNormalizer()->contentId($contentId));
        if ($content === null) {
            throw ApiException::notFound('컨텐츠를 찾을 수 없습니다.');
        }

        return $this->presenter()->present($content);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(array $payload): array
    {
        $normalized = $this->payloadNormalizer()->create($payload);
        $contentId = (string)$normalized['co_id'];

        if ($this->repository->find($contentId) !== null) {
            throw ApiException::conflict('이미 존재하는 컨텐츠 ID입니다.');
        }

        $this->repository->create($normalized);

        $created = $this->repository->find($contentId);
        if ($created === null) {
            throw ApiException::serverError('컨텐츠 생성 후 조회에 실패했습니다.');
        }

        return $this->presenter()->present($created);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(string $contentId, array $payload): array
    {
        $normalizedId = $this->payloadNormalizer()->contentId($contentId);
        $existing = $this->repository->find($normalizedId);
        if (!is_array($existing)) {
            throw ApiException::notFound('컨텐츠를 찾을 수 없습니다.');
        }

        $normalizedPayload = $this->payloadNormalizer()->update($payload);
        $affected = $this->repository->update($normalizedId, $normalizedPayload);
        if ($affected <= 0) {
            throw ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $updated = $this->repository->find($normalizedId);

        return $this->presenter()->present(is_array($updated) ? $updated : $existing);
    }

    public function delete(string $contentId): void
    {
        $normalized = $this->payloadNormalizer()->contentId($contentId);
        if ($this->repository->delete($normalized) <= 0) {
            throw ApiException::notFound('컨텐츠를 찾을 수 없습니다.');
        }
    }

    /**
     * @return array<string, int|bool>
     */
    private function buildPagination(int $page, int $perPage, int $total): array
    {
        $lastPage = max(1, (int)ceil($total / $perPage));

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => $lastPage,
            'has_next' => $page < $lastPage,
            'has_prev' => $page > 1,
        ];
    }

    private function payloadNormalizer(): AdminContentPayloadNormalizer
    {
        return $this->resolvedPayloadNormalizer ??= new AdminContentPayloadNormalizer();
    }

    private function presenter(): AdminContentPresenter
    {
        return $this->resolvedPresenter ??= new AdminContentPresenter();
    }
}
