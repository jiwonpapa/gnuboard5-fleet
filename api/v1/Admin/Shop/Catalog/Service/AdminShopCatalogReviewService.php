<?php

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Service;

use Api\Admin\Shop\Catalog\Repository\AdminShopCatalogRepository;

final class AdminShopCatalogReviewService
{
    use AdminShopCatalogServiceHelpers;

    public function __construct(private readonly AdminShopCatalogRepository $repository)
    {
    }

    public function listReviews(array $query): array
    {
        $query = $this->normalizeListQuery($query);
        $page = $query['page'];
        $perPage = $query['per_page'];

        return [
            'items' => $this->repository->listReviews($page, $perPage),
            'pagination' => $this->buildPagination($page, $perPage, $this->repository->countReviews()),
        ];
    }

    public function answerReview(int $id, array $payload): array
    {
        $reviewId = (int)$id;
        if ($payload === []) {
            throw \Api\Support\Exception\ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $updated = $this->repository->answerReview($reviewId, $payload);
        if ($updated === []) {
            $review = $this->repository->findReview($reviewId);
            if ($review === null) {
                throw \Api\Support\Exception\ApiException::notFound('상품사용후기를 찾을 수 없습니다.');
            }

            throw \Api\Support\Exception\ApiException::badRequest('수정할 필드가 없습니다.');
        }

        return $updated;
    }
}
