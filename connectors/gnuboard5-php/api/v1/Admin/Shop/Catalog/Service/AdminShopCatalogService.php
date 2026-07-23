<?php

/**
 * AdminShopCatalogService API module.
 *
 * @package  Api\Admin\Shop\Catalog\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Service;

use Api\Admin\Shop\Catalog\Repository\AdminShopCatalogRepository;

final class AdminShopCatalogService
{
    private ?AdminShopCatalogCategoryService $categoryService = null;
    private ?AdminShopCatalogProductService $productService = null;
    private ?AdminShopCatalogStockSmsService $stockSmsService = null;
    private ?AdminShopCatalogReviewService $reviewService = null;
    private ?AdminShopCatalogInquiryService $inquiryService = null;
    private ?AdminShopCatalogEventService $eventService = null;

    public function __construct(private readonly AdminShopCatalogRepository $repository)
    {
    }

    public function listCategories(array $query): array
    {
        return $this->categoryService()->listCategories($query);
    }

    public function createCategory(array $payload): array
    {
        return $this->categoryService()->createCategory($payload);
    }

    public function getCategory(int $id): array
    {
        return $this->categoryService()->getCategory($id);
    }

    public function updateCategory(int $id, array $payload): array
    {
        return $this->categoryService()->updateCategory($id, $payload);
    }

    public function deleteCategory(int $id): void
    {
        $this->categoryService()->deleteCategory($id);
    }

    public function listProducts(array $query): array
    {
        return $this->productService()->listProducts($query);
    }

    public function createProduct(array $payload): array
    {
        return $this->productService()->createProduct($payload);
    }

    public function getProduct(int $id): array
    {
        return $this->productService()->getProduct($id);
    }

    public function updateProduct(int $id, array $payload): array
    {
        return $this->productService()->updateProduct($id, $payload);
    }

    public function deleteProduct(int $id): void
    {
        $this->productService()->deleteProduct($id);
    }

    public function updateProductStock(int $id, array $payload): array
    {
        return $this->productService()->updateProductStock($id, $payload);
    }

    public function listProductOptions(int $id): array
    {
        return $this->productService()->listProductOptions($id);
    }

    public function updateProductOptions(int $id, array $payload): array
    {
        return $this->productService()->updateProductOptions($id, $payload);
    }

    public function listStockSms(array $query): array
    {
        return $this->stockSmsService()->listStockSms($query);
    }

    public function updateStockSms(int $id, array $payload): array
    {
        return $this->stockSmsService()->updateStockSms($id, $payload);
    }

    public function sendStockSms(int $id): array
    {
        return $this->stockSmsService()->sendStockSms($id);
    }

    public function deleteStockSms(int $id): void
    {
        $this->stockSmsService()->deleteStockSms($id);
    }

    public function listReviews(array $query): array
    {
        return $this->reviewService()->listReviews($query);
    }

    public function answerReview(int $id, array $payload): array
    {
        return $this->reviewService()->answerReview($id, $payload);
    }

    public function listInquiries(array $query): array
    {
        return $this->inquiryService()->listInquiries($query);
    }

    public function answerInquiry(int $id, array $payload): array
    {
        return $this->inquiryService()->answerInquiry($id, $payload);
    }

    public function listEvents(array $query): array
    {
        return $this->eventService()->listEvents($query);
    }

    public function createEvent(array $payload): array
    {
        return $this->eventService()->createEvent($payload);
    }

    public function getEvent(int $id): array
    {
        return $this->eventService()->getEvent($id);
    }

    public function updateEvent(int $id, array $payload): array
    {
        return $this->eventService()->updateEvent($id, $payload);
    }

    public function deleteEvent(int $id): void
    {
        $this->eventService()->deleteEvent($id);
    }

    private function categoryService(): AdminShopCatalogCategoryService
    {
        if ($this->categoryService instanceof AdminShopCatalogCategoryService) {
            return $this->categoryService;
        }

        $this->categoryService = new AdminShopCatalogCategoryService($this->repository);

        return $this->categoryService;
    }

    private function productService(): AdminShopCatalogProductService
    {
        if ($this->productService instanceof AdminShopCatalogProductService) {
            return $this->productService;
        }

        $this->productService = new AdminShopCatalogProductService($this->repository);

        return $this->productService;
    }

    private function stockSmsService(): AdminShopCatalogStockSmsService
    {
        if ($this->stockSmsService instanceof AdminShopCatalogStockSmsService) {
            return $this->stockSmsService;
        }

        $this->stockSmsService = new AdminShopCatalogStockSmsService($this->repository);

        return $this->stockSmsService;
    }

    private function reviewService(): AdminShopCatalogReviewService
    {
        if ($this->reviewService instanceof AdminShopCatalogReviewService) {
            return $this->reviewService;
        }

        $this->reviewService = new AdminShopCatalogReviewService($this->repository);

        return $this->reviewService;
    }

    private function inquiryService(): AdminShopCatalogInquiryService
    {
        if ($this->inquiryService instanceof AdminShopCatalogInquiryService) {
            return $this->inquiryService;
        }

        $this->inquiryService = new AdminShopCatalogInquiryService($this->repository);

        return $this->inquiryService;
    }

    private function eventService(): AdminShopCatalogEventService
    {
        if ($this->eventService instanceof AdminShopCatalogEventService) {
            return $this->eventService;
        }

        $this->eventService = new AdminShopCatalogEventService($this->repository);

        return $this->eventService;
    }
}
