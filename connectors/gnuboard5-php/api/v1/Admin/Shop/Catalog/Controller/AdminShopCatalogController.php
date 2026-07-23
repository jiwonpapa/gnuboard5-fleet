<?php

/**
 * AdminShopCatalogController API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Shop\Catalog\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Controller;

use Api\Admin\Shop\Catalog\Service\AdminShopCatalogService;
use Api\Support\Exception\ApiException;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminShopCatalogController
{
    public function __construct(private readonly AdminShopCatalogService $service)
    {
    }

    public function listCategories(Request $request, Response $response): Response
    {
        return ApiResponse::envelope($response, $this->service->listCategories($request->getQueryParams()));
    }

    public function createCategory(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->createCategory($payload), null, [], 201);
    }

    public function detailCategory(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['category_id'] ?? ''));

        return ApiResponse::envelope($response, $this->service->getCategory($id));
    }

    public function updateCategory(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['category_id'] ?? ''));
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->updateCategory($id, $payload));
    }

    public function deleteCategory(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['category_id'] ?? ''));
        $this->service->deleteCategory($id);

        return $response->withStatus(204);
    }

    public function listProducts(Request $request, Response $response): Response
    {
        return ApiResponse::envelope($response, $this->service->listProducts($request->getQueryParams()));
    }

    public function createProduct(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->createProduct($payload), null, [], 201);
    }

    public function detailProduct(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['product_id'] ?? ''));

        return ApiResponse::envelope($response, $this->service->getProduct($id));
    }

    public function updateProduct(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['product_id'] ?? ''));
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->updateProduct($id, $payload));
    }

    public function deleteProduct(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['product_id'] ?? ''));
        $this->service->deleteProduct($id);

        return $response->withStatus(204);
    }

    public function updateProductStock(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['product_id'] ?? ''));
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->updateProductStock($id, $payload));
    }

    public function getProductOptions(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['product_id'] ?? ''));

        return ApiResponse::envelope($response, $this->service->listProductOptions($id));
    }

    public function updateProductOptions(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['product_id'] ?? ''));
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->updateProductOptions($id, $payload));
    }

    public function listStockSms(Request $request, Response $response): Response
    {
        return ApiResponse::envelope($response, $this->service->listStockSms($request->getQueryParams()));
    }

    public function updateStockSms(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['stock_sms_id'] ?? ''));
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->updateStockSms($id, $payload));
    }

    public function sendStockSms(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['stock_sms_id'] ?? ''));

        return ApiResponse::envelope($response, $this->service->sendStockSms($id));
    }

    public function deleteStockSms(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['stock_sms_id'] ?? ''));
        $this->service->deleteStockSms($id);

        return $response->withStatus(204);
    }

    public function listReviews(Request $request, Response $response): Response
    {
        return ApiResponse::envelope($response, $this->service->listReviews($request->getQueryParams()));
    }

    public function answerReview(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['review_id'] ?? ''));
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->answerReview($id, $payload));
    }

    public function listInquiries(Request $request, Response $response): Response
    {
        return ApiResponse::envelope($response, $this->service->listInquiries($request->getQueryParams()));
    }

    public function answerInquiry(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['inquiry_id'] ?? ''));
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->answerInquiry($id, $payload));
    }

    public function listEvents(Request $request, Response $response): Response
    {
        return ApiResponse::envelope($response, $this->service->listEvents($request->getQueryParams()));
    }

    public function createEvent(Request $request, Response $response): Response
    {
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->createEvent($payload), null, [], 201);
    }

    public function detailEvent(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['event_id'] ?? ''));

        return ApiResponse::envelope($response, $this->service->getEvent($id));
    }

    public function updateEvent(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['event_id'] ?? ''));
        $payload = ApiResponse::parseJsonBody($request);

        return ApiResponse::envelope($response, $this->service->updateEvent($id, $payload));
    }

    public function deleteEvent(Request $request, Response $response, array $args): Response
    {
        $id = $this->requiredInt((string)($args['event_id'] ?? ''));
        $this->service->deleteEvent($id);

        return $response->withStatus(204);
    }

    private function requiredInt(string $value): int
    {
        if ($value === '') {
            throw ApiException::badRequest('리소스 식별자가 비어 있습니다.');
        }

        if (!ctype_digit($value) || (int)$value <= 0) {
            throw ApiException::badRequest('리소스 식별자는 정수여야 합니다.');
        }

        return (int)$value;
    }
}
