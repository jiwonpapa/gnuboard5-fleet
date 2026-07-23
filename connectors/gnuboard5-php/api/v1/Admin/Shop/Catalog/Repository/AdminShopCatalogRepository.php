<?php

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Repository;

use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;

final class AdminShopCatalogRepository
{
    private ?AdminShopCatalogCategoryRepository $categoryRepository = null;
    private ?AdminShopCatalogProductRepository $productRepository = null;
    private ?AdminShopCatalogStockSmsRepository $stockSmsRepository = null;
    private ?AdminShopCatalogReviewRepository $reviewRepository = null;
    private ?AdminShopCatalogInquiryRepository $inquiryRepository = null;
    private ?AdminShopCatalogEventRepository $eventRepository = null;

    public function __construct(
        private readonly ?QueryBuilder $qb = null,
        private readonly ?TableRegistry $tables = null
    ) {
    }

    public function listCategories(int $page, int $perPage): array
    {
        return $this->categoryRepository()->listCategories($page, $perPage);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function createCategory(array $payload): array
    {
        return $this->categoryRepository()->createCategory($payload);
    }

    public function findCategory(string $categoryId): ?array
    {
        return $this->categoryRepository()->findCategory($categoryId);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function updateCategory(string $categoryId, array $payload): array
    {
        return $this->categoryRepository()->updateCategory($categoryId, $payload);
    }

    public function deleteCategory(string $categoryId): int
    {
        return $this->categoryRepository()->deleteCategory($categoryId);
    }

    public function listProducts(int $page, int $perPage): array
    {
        return $this->productRepository()->listProducts($page, $perPage);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function createProduct(array $payload): array
    {
        return $this->productRepository()->createProduct($payload);
    }

    public function findProduct(string $productId): ?array
    {
        return $this->productRepository()->findProduct($productId);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function updateProduct(string $productId, array $payload): array
    {
        return $this->productRepository()->updateProduct($productId, $payload);
    }

    public function deleteProduct(string $productId): int
    {
        return $this->productRepository()->deleteProduct($productId);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function updateProductStock(string $productId, array $payload): array
    {
        return $this->productRepository()->updateProductStock($productId, $payload);
    }

    public function listProductOptions(string $productId): array
    {
        return $this->productRepository()->listProductOptions($productId);
    }

    /**
     * @param list<array<string,mixed>> $payload
     */
    public function updateProductOptions(string $productId, array $payload): array
    {
        return $this->productRepository()->updateProductOptions($productId, $payload);
    }

    public function findProductOption(string $productId, string $optionId): ?array
    {
        return $this->productRepository()->findProductOption($productId, $optionId);
    }

    public function listStockSms(int $page, int $perPage): array
    {
        return $this->stockSmsRepository()->listStockSms($page, $perPage);
    }

    public function findStockSms(string $stockSmsId): ?array
    {
        return $this->stockSmsRepository()->findStockSms($stockSmsId);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function updateStockSms(string $stockSmsId, array $payload): array
    {
        return $this->stockSmsRepository()->updateStockSms($stockSmsId, $payload);
    }

    public function sendStockSms(string $stockSmsId): array
    {
        return $this->stockSmsRepository()->sendStockSms($stockSmsId);
    }

    public function deleteStockSms(string $stockSmsId): int
    {
        return $this->stockSmsRepository()->deleteStockSms($stockSmsId);
    }

    public function listReviews(int $page, int $perPage): array
    {
        return $this->reviewRepository()->listReviews($page, $perPage);
    }

    public function findReview(int $reviewId): ?array
    {
        return $this->reviewRepository()->findReview($reviewId);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function answerReview(int $reviewId, array $payload): array
    {
        return $this->reviewRepository()->answerReview($reviewId, $payload);
    }

    public function countReviews(): int
    {
        return $this->reviewRepository()->countReviews();
    }

    public function listInquiries(int $page, int $perPage): array
    {
        return $this->inquiryRepository()->listInquiries($page, $perPage);
    }

    public function findInquiry(int $inquiryId): ?array
    {
        return $this->inquiryRepository()->findInquiry($inquiryId);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function answerInquiry(int $inquiryId, array $payload): array
    {
        return $this->inquiryRepository()->answerInquiry($inquiryId, $payload);
    }

    public function countInquiries(): int
    {
        return $this->inquiryRepository()->countInquiries();
    }

    public function listEvents(int $page, int $perPage): array
    {
        return $this->eventRepository()->listEvents($page, $perPage);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function createEvent(array $payload): array
    {
        return $this->eventRepository()->createEvent($payload);
    }

    public function findEvent(int $eventId): ?array
    {
        return $this->eventRepository()->findEvent($eventId);
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function updateEvent(int $eventId, array $payload): array
    {
        return $this->eventRepository()->updateEvent($eventId, $payload);
    }

    public function deleteEvent(int $eventId): int
    {
        return $this->eventRepository()->deleteEvent($eventId);
    }

    private function categoryRepository(): AdminShopCatalogCategoryRepository
    {
        if ($this->categoryRepository instanceof AdminShopCatalogCategoryRepository) {
            return $this->categoryRepository;
        }

        $this->categoryRepository = new AdminShopCatalogCategoryRepository($this->queryBuilder(), $this->tables());

        return $this->categoryRepository;
    }

    private function productRepository(): AdminShopCatalogProductRepository
    {
        if ($this->productRepository instanceof AdminShopCatalogProductRepository) {
            return $this->productRepository;
        }

        $this->productRepository = new AdminShopCatalogProductRepository($this->queryBuilder(), $this->tables());

        return $this->productRepository;
    }

    private function stockSmsRepository(): AdminShopCatalogStockSmsRepository
    {
        if ($this->stockSmsRepository instanceof AdminShopCatalogStockSmsRepository) {
            return $this->stockSmsRepository;
        }

        $this->stockSmsRepository = new AdminShopCatalogStockSmsRepository($this->queryBuilder(), $this->tables());

        return $this->stockSmsRepository;
    }

    private function reviewRepository(): AdminShopCatalogReviewRepository
    {
        if ($this->reviewRepository instanceof AdminShopCatalogReviewRepository) {
            return $this->reviewRepository;
        }

        $this->reviewRepository = new AdminShopCatalogReviewRepository($this->queryBuilder(), $this->tables());

        return $this->reviewRepository;
    }

    private function inquiryRepository(): AdminShopCatalogInquiryRepository
    {
        if ($this->inquiryRepository instanceof AdminShopCatalogInquiryRepository) {
            return $this->inquiryRepository;
        }

        $this->inquiryRepository = new AdminShopCatalogInquiryRepository($this->queryBuilder(), $this->tables());

        return $this->inquiryRepository;
    }

    private function eventRepository(): AdminShopCatalogEventRepository
    {
        if ($this->eventRepository instanceof AdminShopCatalogEventRepository) {
            return $this->eventRepository;
        }

        $this->eventRepository = new AdminShopCatalogEventRepository($this->queryBuilder(), $this->tables());

        return $this->eventRepository;
    }

    private function queryBuilder(): QueryBuilder
    {
        return $this->qb ?? new QueryBuilder();
    }

    private function tables(): TableRegistry
    {
        return $this->tables ?? new TableRegistry('g5_');
    }
}
