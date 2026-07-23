<?php

declare(strict_types=1);

use Api\Admin\Poll\Controller\AdminPollController;
use Api\Admin\Popup\Controller\AdminPopupController;
use Api\Config\Controller\ConfigController;
use Api\Layout\Controller\LayoutController;
use Api\Menu\Controller\MenuController;
use Api\Middlewares\OptionalJwtAuthMiddleware;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (RouteCollectorProxy $app, callable $resolve): void {
    $createAdminPollController = static fn (): AdminPollController => $resolve(AdminPollController::class);
    $createAdminPopupController = static fn (): AdminPopupController => $resolve(AdminPopupController::class);
    $createConfigController = static fn (): ConfigController => $resolve(ConfigController::class);
    $createMenuController = static fn (): MenuController => $resolve(MenuController::class);
    $createLayoutController = static fn (): LayoutController => $resolve(LayoutController::class);
    $createOptionalJwtAuthMiddleware = static fn (): OptionalJwtAuthMiddleware => $resolve(OptionalJwtAuthMiddleware::class);

    $app->group('/polls', function (RouteCollectorProxy $app) use (
        $createAdminPollController,
        $createOptionalJwtAuthMiddleware
    ) {
        $app->get('/active', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPollController) {
            return $createAdminPollController()->active($request, $response);
        })->add($createOptionalJwtAuthMiddleware());

        $app->post('/{po_id}/vote', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminPollController) {
            return $createAdminPollController()->vote($request, $response, $args);
        })->add($createOptionalJwtAuthMiddleware());

        $app->get('/{po_id}/result', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminPollController) {
            return $createAdminPollController()->result($request, $response, $args);
        })->add($createOptionalJwtAuthMiddleware());
    });

    $app->group('/popups', function (RouteCollectorProxy $app) use ($createAdminPopupController) {
        $app->get('/active', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPopupController) {
            return $createAdminPopupController()->active($request, $response);
        });
    });

    $app->get('/config', function (RequestInterface $request, ResponseInterface $response) use ($createConfigController) {
        return $createConfigController()->getConfig($request, $response);
    });

    $app->get('/menus', function (RequestInterface $request, ResponseInterface $response) use ($createMenuController) {
        return $createMenuController()->list($request, $response);
    });

    $app->group('/layouts', function (RouteCollectorProxy $app) use ($createLayoutController) {
        $app->get('/{page_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createLayoutController) {
            return $createLayoutController()->detail($request, $response, $args);
        });

        $app->get('/{page_id}/widgets/{widget_id}/data', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createLayoutController) {
            return $createLayoutController()->widgetData($request, $response, $args);
        });
    });
};
