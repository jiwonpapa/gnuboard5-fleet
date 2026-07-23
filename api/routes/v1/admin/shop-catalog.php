<?php

declare(strict_types=1);

use Api\Admin\Shop\Catalog\Controller\AdminShopCatalogController;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (RouteCollectorProxy $app, callable $resolve, ?callable $isAdminSmsEnabled = null): void {
    unset($isAdminSmsEnabled);

    $createController = static fn (): AdminShopCatalogController => $resolve(AdminShopCatalogController::class);

    $app->group('/shop/catalog', function (RouteCollectorProxy $app) use ($createController) {
        $app->group('/categories', function (RouteCollectorProxy $app) use ($createController) {
            $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createController) {
                return $createController()->listCategories($request, $response);
            });
            $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createController) {
                return $createController()->createCategory($request, $response);
            });
            $app->get('/{category_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->detailCategory($request, $response, $args);
            });
            $app->patch('/{category_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->updateCategory($request, $response, $args);
            });
            $app->delete('/{category_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->deleteCategory($request, $response, $args);
            });
        });

        $app->group('/products', function (RouteCollectorProxy $app) use ($createController) {
            $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createController) {
                return $createController()->listProducts($request, $response);
            });
            $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createController) {
                return $createController()->createProduct($request, $response);
            });
            $app->get('/{product_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->detailProduct($request, $response, $args);
            });
            $app->patch('/{product_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->updateProduct($request, $response, $args);
            });
            $app->delete('/{product_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->deleteProduct($request, $response, $args);
            });
            $app->patch('/{product_id}/stock', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->updateProductStock($request, $response, $args);
            });
            $app->get('/{product_id}/options', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->getProductOptions($request, $response, $args);
            });
            $app->patch('/{product_id}/options', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->updateProductOptions($request, $response, $args);
            });
        });

        $app->group('/stocksms', function (RouteCollectorProxy $app) use ($createController) {
            $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createController) {
                return $createController()->listStockSms($request, $response);
            });
            $app->patch('/{stock_sms_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->updateStockSms($request, $response, $args);
            });
            $app->post('/{stock_sms_id}/send', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->sendStockSms($request, $response, $args);
            });
            $app->delete('/{stock_sms_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->deleteStockSms($request, $response, $args);
            });
        });

        $app->group('/reviews', function (RouteCollectorProxy $app) use ($createController) {
            $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createController) {
                return $createController()->listReviews($request, $response);
            });
            $app->patch('/{review_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->answerReview($request, $response, $args);
            });
        });

        $app->group('/inquiries', function (RouteCollectorProxy $app) use ($createController) {
            $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createController) {
                return $createController()->listInquiries($request, $response);
            });
            $app->patch('/{inquiry_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->answerInquiry($request, $response, $args);
            });
        });

        $app->group('/events', function (RouteCollectorProxy $app) use ($createController) {
            $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createController) {
                return $createController()->listEvents($request, $response);
            });
            $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createController) {
                return $createController()->createEvent($request, $response);
            });
            $app->get('/{event_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->detailEvent($request, $response, $args);
            });
            $app->patch('/{event_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->updateEvent($request, $response, $args);
            });
            $app->delete('/{event_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createController) {
                return $createController()->deleteEvent($request, $response, $args);
            });
        });
    });
};
