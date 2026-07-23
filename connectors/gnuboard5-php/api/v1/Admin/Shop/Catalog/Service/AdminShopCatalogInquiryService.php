<?php

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Service;

use Api\Admin\Shop\Catalog\Repository\AdminShopCatalogRepository;

final class AdminShopCatalogInquiryService
{
    use AdminShopCatalogServiceHelpers;

    public function __construct(private readonly AdminShopCatalogRepository $repository)
    {
    }

    public function listInquiries(array $query): array
    {
        $query = $this->normalizeListQuery($query);
        $page = $query['page'];
        $perPage = $query['per_page'];

        return [
            'items' => $this->repository->listInquiries($page, $perPage),
            'pagination' => $this->buildPagination($page, $perPage, $this->repository->countInquiries()),
        ];
    }

    public function answerInquiry(int $id, array $payload): array
    {
        $inquiryId = (int)$id;
        if ($payload === []) {
            throw \Api\Support\Exception\ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $updated = $this->repository->answerInquiry($inquiryId, $payload);
        if ($updated === []) {
            $inquiry = $this->repository->findInquiry($inquiryId);
            if ($inquiry === null) {
                throw \Api\Support\Exception\ApiException::notFound('상품문의를 찾을 수 없습니다.');
            }

            throw \Api\Support\Exception\ApiException::badRequest('수정할 필드가 없습니다.');
        }

        return $updated;
    }
}
