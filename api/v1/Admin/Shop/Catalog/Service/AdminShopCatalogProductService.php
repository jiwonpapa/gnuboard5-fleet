<?php

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Service;

use Api\Admin\Shop\Catalog\Repository\AdminShopCatalogRepository;

final class AdminShopCatalogProductService
{
    use AdminShopCatalogServiceHelpers;

    public function __construct(private readonly AdminShopCatalogRepository $repository)
    {
    }

    public function listProducts(array $query): array
    {
        $query = $this->normalizeListQuery($query);
        $page = $query['page'];
        $perPage = $query['per_page'];

        $result = $this->repository->listProducts($page, $perPage);
        $items = $result['items'];
        $total = $result['total'] ?? 0;

        return [
            'items' => $items,
            'pagination' => $this->buildPagination($page, $perPage, (int)$total),
        ];
    }

    public function createProduct(array $payload): array
    {
        if ($payload === []) {
            throw \Api\Support\Exception\ApiException::badRequest('요청 본문이 비어 있습니다.');
        }

        if (!isset($payload['it_id']) || trim((string)$payload['it_id']) === '') {
            throw \Api\Support\Exception\ApiException::badRequest('it_id는 필수입니다.');
        }

        $productId = trim((string)$payload['it_id']);
        if ($this->repository->findProduct($productId) !== null) {
            throw \Api\Support\Exception\ApiException::conflict('이미 존재하는 상품입니다.');
        }

        $created = $this->repository->createProduct($payload);
        if ($created === []) {
            throw \Api\Support\Exception\ApiException::badRequest('상품 생성 데이터가 유효하지 않습니다.');
        }

        return $created;
    }

    public function getProduct(int $id): array
    {
        $product = $this->repository->findProduct((string)$id);
        if (!is_array($product)) {
            throw \Api\Support\Exception\ApiException::notFound('상품을 찾을 수 없습니다.');
        }

        return $product;
    }

    public function updateProduct(int $id, array $payload): array
    {
        $productId = (string)$id;
        if ($this->repository->findProduct($productId) === null) {
            throw \Api\Support\Exception\ApiException::notFound('상품을 찾을 수 없습니다.');
        }

        if ($payload === []) {
            throw \Api\Support\Exception\ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $updated = $this->repository->updateProduct($productId, $payload);
        if ($updated === []) {
            throw \Api\Support\Exception\ApiException::badRequest('수정할 필드가 없습니다.');
        }

        return $updated;
    }

    public function deleteProduct(int $id): void
    {
        if ($this->repository->deleteProduct((string)$id) <= 0) {
            throw \Api\Support\Exception\ApiException::notFound('상품을 찾을 수 없습니다.');
        }
    }

    public function updateProductStock(int $id, array $payload): array
    {
        $productId = (string)$id;
        if ($this->repository->findProduct($productId) === null) {
            throw \Api\Support\Exception\ApiException::notFound('상품을 찾을 수 없습니다.');
        }

        if ($payload === []) {
            throw \Api\Support\Exception\ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $updated = $this->repository->updateProductStock($productId, $payload);
        if ($updated === []) {
            throw \Api\Support\Exception\ApiException::badRequest('수정할 필드가 없습니다.');
        }

        return $updated;
    }

    public function listProductOptions(int $id): array
    {
        if ($this->repository->findProduct((string)$id) === null) {
            throw \Api\Support\Exception\ApiException::notFound('상품을 찾을 수 없습니다.');
        }

        return [
            'product_id' => $id,
            'items' => $this->repository->listProductOptions((string)$id),
        ];
    }

    /**
     * @param array<string,mixed> $payload
     * @return list<array<string,mixed>>
     */
    public function updateProductOptions(int $id, array $payload): array
    {
        $productId = (string)$id;
        if ($this->repository->findProduct($productId) === null) {
            throw \Api\Support\Exception\ApiException::notFound('상품을 찾을 수 없습니다.');
        }

        $payloadList = $this->normalizePayloadList($payload);
        if ($payloadList === []) {
            throw \Api\Support\Exception\ApiException::badRequest('수정할 옵션이 없습니다.');
        }

        foreach ($payloadList as $row) {
            if (!isset($row['io_no']) || trim((string)$row['io_no']) === '') {
                throw \Api\Support\Exception\ApiException::badRequest('옵션 식별자가 없습니다.');
            }

            $optionId = (string)$row['io_no'];
            if ($this->repository->findProductOption($productId, $optionId) === null) {
                throw \Api\Support\Exception\ApiException::notFound('상품 옵션을 찾을 수 없습니다.');
            }
        }

        $updated = $this->repository->updateProductOptions($productId, $payloadList);
        if ($updated === []) {
            throw \Api\Support\Exception\ApiException::badRequest('수정할 필드가 없습니다.');
        }

        return $updated;
    }

    /**
     * @param array<string,mixed> $payload
     * @return list<array<string,mixed>>
     */
    private function normalizePayloadList(array $payload): array
    {
        if ($payload === []) {
            return [];
        }

        $list = array_is_list($payload) ? $payload : [$payload];

        $result = [];
        foreach ($list as $row) {
            if (!is_array($row)) {
                throw \Api\Support\Exception\ApiException::badRequest('옵션 데이터 형식이 잘못되었습니다.');
            }

            $result[] = $row;
        }

        return $result;
    }
}
