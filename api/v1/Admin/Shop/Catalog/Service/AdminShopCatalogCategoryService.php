<?php

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Service;

use Api\Admin\Shop\Catalog\Repository\AdminShopCatalogRepository;

final class AdminShopCatalogCategoryService
{
    use AdminShopCatalogServiceHelpers;

    public function __construct(private readonly AdminShopCatalogRepository $repository)
    {
    }

    public function listCategories(array $query): array
    {
        $query = $this->normalizeListQuery($query);
        $page = $query['page'];
        $perPage = $query['per_page'];

        $result = $this->repository->listCategories($page, $perPage);
        $items = $result['items'];
        $total = $result['total'] ?? 0;

        return [
            'items' => $items,
            'pagination' => $this->buildPagination($page, $perPage, (int)$total),
        ];
    }

    public function createCategory(array $payload): array
    {
        if ($payload === []) {
            throw \Api\Support\Exception\ApiException::badRequest('요청 본문이 비어 있습니다.');
        }

        $created = $this->repository->createCategory($payload);
        if ($created === []) {
            throw \Api\Support\Exception\ApiException::badRequest('카테고리 생성 데이터가 유효하지 않습니다.');
        }

        return $created;
    }

    public function getCategory(int $id): array
    {
        $category = $this->repository->findCategory((string)$id);
        if (!is_array($category)) {
            throw \Api\Support\Exception\ApiException::notFound('카테고리를 찾을 수 없습니다.');
        }

        return $category;
    }

    public function updateCategory(int $id, array $payload): array
    {
        $categoryId = (string)$id;
        if ($this->repository->findCategory($categoryId) === null) {
            throw \Api\Support\Exception\ApiException::notFound('카테고리를 찾을 수 없습니다.');
        }

        if ($payload === []) {
            throw \Api\Support\Exception\ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $updated = $this->repository->updateCategory($categoryId, $payload);
        if ($updated === []) {
            throw \Api\Support\Exception\ApiException::badRequest('수정할 필드가 없습니다.');
        }

        return $updated;
    }

    public function deleteCategory(int $id): void
    {
        if ($this->repository->deleteCategory((string)$id) <= 0) {
            throw \Api\Support\Exception\ApiException::notFound('카테고리를 찾을 수 없습니다.');
        }
    }
}
