<?php

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Service;

use Api\Admin\Shop\Catalog\Repository\AdminShopCatalogRepository;

final class AdminShopCatalogEventService
{
    use AdminShopCatalogServiceHelpers;

    public function __construct(private readonly AdminShopCatalogRepository $repository)
    {
    }

    public function listEvents(array $query): array
    {
        $query = $this->normalizeListQuery($query);
        $page = $query['page'];
        $perPage = $query['per_page'];

        $result = $this->repository->listEvents($page, $perPage);
        $items = $result['items'];
        $total = $result['total'] ?? 0;

        return [
            'items' => $items,
            'pagination' => $this->buildPagination($page, $perPage, (int)$total),
        ];
    }

    public function createEvent(array $payload): array
    {
        if ($payload === []) {
            throw \Api\Support\Exception\ApiException::badRequest('요청 본문이 비어 있습니다.');
        }

        $created = $this->repository->createEvent($payload);
        if ($created === []) {
            throw \Api\Support\Exception\ApiException::badRequest('이벤트 생성 데이터가 유효하지 않습니다.');
        }

        return $created;
    }

    public function getEvent(int $id): array
    {
        $event = $this->repository->findEvent($id);
        if (!is_array($event)) {
            throw \Api\Support\Exception\ApiException::notFound('이벤트를 찾을 수 없습니다.');
        }

        return $event;
    }

    public function updateEvent(int $id, array $payload): array
    {
        $eventId = (int)$id;
        if ($this->repository->findEvent($eventId) === null) {
            throw \Api\Support\Exception\ApiException::notFound('이벤트를 찾을 수 없습니다.');
        }

        if ($payload === []) {
            throw \Api\Support\Exception\ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $updated = $this->repository->updateEvent($eventId, $payload);
        if ($updated === []) {
            throw \Api\Support\Exception\ApiException::badRequest('수정할 필드가 없습니다.');
        }

        return $updated;
    }

    public function deleteEvent(int $id): void
    {
        if ($this->repository->deleteEvent((int)$id) <= 0) {
            throw \Api\Support\Exception\ApiException::notFound('이벤트를 찾을 수 없습니다.');
        }
    }
}
