<?php

/**
 * AdminShopCatalogStockSmsService API module.
 *
 * @package  Api\Admin\Shop\Catalog\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Service;

use Api\Admin\Shop\Catalog\Repository\AdminShopCatalogRepository;

final class AdminShopCatalogStockSmsService
{
    use AdminShopCatalogServiceHelpers;

    public function __construct(private readonly AdminShopCatalogRepository $repository)
    {
    }

    public function listStockSms(array $query): array
    {
        $query = $this->normalizeListQuery($query);
        $page = $query['page'];
        $perPage = $query['per_page'];

        $result = $this->repository->listStockSms($page, $perPage);
        $items = $result['items'];
        $total = $result['total'] ?? 0;

        return [
            'items' => $items,
            'pagination' => $this->buildPagination($page, $perPage, (int)$total),
        ];
    }

    public function updateStockSms(int $id, array $payload): array
    {
        $stockSmsId = (string)$id;
        if (!$this->repository->findStockSms($stockSmsId)) {
            throw \Api\Support\Exception\ApiException::notFound('재입고 알림이 없습니다.');
        }

        if ($payload === []) {
            throw \Api\Support\Exception\ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $updated = $this->repository->updateStockSms($stockSmsId, $payload);
        if ($updated === []) {
            throw \Api\Support\Exception\ApiException::badRequest('수정할 필드가 없습니다.');
        }

        return $updated;
    }

    public function sendStockSms(int $id): array
    {
        $stockSmsId = (string)$id;
        if (!$this->repository->findStockSms($stockSmsId)) {
            throw \Api\Support\Exception\ApiException::notFound('재입고 알림이 없습니다.');
        }

        $updated = $this->repository->sendStockSms($stockSmsId);
        if ($updated === []) {
            throw \Api\Support\Exception\ApiException::badRequest('재입고 알림 상태를 변경할 수 없습니다.');
        }

        return $updated;
    }

    public function deleteStockSms(int $id): void
    {
        if ($this->repository->deleteStockSms((string)$id) <= 0) {
            throw \Api\Support\Exception\ApiException::notFound('재입고 알림이 없습니다.');
        }
    }
}
