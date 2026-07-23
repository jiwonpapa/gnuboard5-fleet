<?php

declare(strict_types=1);

use Api\Admin\Content\Controller\AdminContentController;
use Api\Admin\Faq\Controller\AdminFaqController;
use Api\Admin\Layout\Controller\AdminLayoutController;
use Api\Admin\Menu\Controller\AdminMenuController;
use Api\Admin\Popular\Controller\AdminPopularController;
use Api\Admin\Report\Controller\AdminReportController;
use Api\Admin\Visit\Controller\AdminVisitController;
use Api\Admin\WriteCount\Controller\AdminWriteCountController;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (RouteCollectorProxy $app, callable $resolve, ?callable $isAdminSmsEnabled = null): void {
    unset($isAdminSmsEnabled);

    $createAdminContentController = static fn (): AdminContentController => $resolve(AdminContentController::class);
    $createAdminFaqController = static fn (): AdminFaqController => $resolve(AdminFaqController::class);
    $createAdminMenuController = static fn (): AdminMenuController => $resolve(AdminMenuController::class);
    $createAdminPopularController = static fn (): AdminPopularController => $resolve(AdminPopularController::class);
    $createAdminVisitController = static fn (): AdminVisitController => $resolve(AdminVisitController::class);
    $createAdminWriteCountController = static fn (): AdminWriteCountController => $resolve(AdminWriteCountController::class);
    $createAdminLayoutController = static fn (): AdminLayoutController => $resolve(AdminLayoutController::class);
    $createAdminReportController = static fn (): AdminReportController => $resolve(AdminReportController::class);

    $app->group('/contents', function (RouteCollectorProxy $app) use ($createAdminContentController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminContentController) {
            return $createAdminContentController()->list($request, $response);
        });
        $app->get('/{co_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminContentController) {
            return $createAdminContentController()->detail($request, $response, $args);
        });
        $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminContentController) {
            return $createAdminContentController()->create($request, $response);
        });
        $app->put('/{co_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminContentController) {
            return $createAdminContentController()->update($request, $response, $args);
        });
        $app->delete('/{co_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminContentController) {
            return $createAdminContentController()->delete($request, $response, $args);
        });
    });

    $app->group('/faqs', function (RouteCollectorProxy $app) use ($createAdminFaqController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminFaqController) {
            return $createAdminFaqController()->list($request, $response);
        });
        $app->get('/{fa_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminFaqController) {
            return $createAdminFaqController()->detail($request, $response, $args);
        });
        $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminFaqController) {
            return $createAdminFaqController()->create($request, $response);
        });
        $app->put('/{fa_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminFaqController) {
            return $createAdminFaqController()->update($request, $response, $args);
        });
        $app->delete('/{fa_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminFaqController) {
            return $createAdminFaqController()->delete($request, $response, $args);
        });
    });

    $app->group('/faq-masters', function (RouteCollectorProxy $app) use ($createAdminFaqController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminFaqController) {
            return $createAdminFaqController()->listMasters($request, $response);
        });
        $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminFaqController) {
            return $createAdminFaqController()->createMaster($request, $response);
        });
        $app->get('/{fm_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminFaqController) {
            return $createAdminFaqController()->detailMaster($request, $response, $args);
        });
        $app->put('/{fm_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminFaqController) {
            return $createAdminFaqController()->updateMaster($request, $response, $args);
        });
        $app->delete('/{fm_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminFaqController) {
            return $createAdminFaqController()->deleteMaster($request, $response, $args);
        });
        $app->post('/{fm_id}/header-image', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminFaqController) {
            return $createAdminFaqController()->uploadHeaderImage($request, $response, $args);
        });
        $app->delete('/{fm_id}/header-image', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminFaqController) {
            return $createAdminFaqController()->deleteHeaderImage($request, $response, $args);
        });
        $app->post('/{fm_id}/footer-image', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminFaqController) {
            return $createAdminFaqController()->uploadFooterImage($request, $response, $args);
        });
        $app->delete('/{fm_id}/footer-image', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminFaqController) {
            return $createAdminFaqController()->deleteFooterImage($request, $response, $args);
        });
    });

    $app->group('/menus', function (RouteCollectorProxy $app) use ($createAdminMenuController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminMenuController) {
            return $createAdminMenuController()->list($request, $response);
        });
        $app->patch('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminMenuController) {
            return $createAdminMenuController()->reorder($request, $response);
        });
        $app->get('/{me_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminMenuController) {
            return $createAdminMenuController()->detail($request, $response, $args);
        });
        $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminMenuController) {
            return $createAdminMenuController()->create($request, $response);
        });
        $app->put('/{me_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminMenuController) {
            return $createAdminMenuController()->update($request, $response, $args);
        });
        $app->delete('/{me_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminMenuController) {
            return $createAdminMenuController()->delete($request, $response, $args);
        });
        $app->patch('/reorder', function (RequestInterface $request, ResponseInterface $response) use ($createAdminMenuController) {
            return $createAdminMenuController()->reorder($request, $response);
        });
    });

    $app->group('/popular', function (RouteCollectorProxy $app) use ($createAdminPopularController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPopularController) {
            return $createAdminPopularController()->list($request, $response);
        });
        $app->get('/rank', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPopularController) {
            return $createAdminPopularController()->rank($request, $response);
        });
        $app->delete('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPopularController) {
            return $createAdminPopularController()->reset($request, $response);
        });
    });

    $app->group('/visits', function (RouteCollectorProxy $app) use ($createAdminVisitController) {
        $app->get('/stats', function (RequestInterface $request, ResponseInterface $response) use ($createAdminVisitController) {
            return $createAdminVisitController()->stats($request, $response);
        });
        $app->get('/search', function (RequestInterface $request, ResponseInterface $response) use ($createAdminVisitController) {
            return $createAdminVisitController()->search($request, $response);
        });
        $app->delete('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminVisitController) {
            return $createAdminVisitController()->delete($request, $response);
        });
    });

    $app->group('/write-count', function (RouteCollectorProxy $app) use ($createAdminWriteCountController) {
        $app->get('/stats', function (RequestInterface $request, ResponseInterface $response) use ($createAdminWriteCountController) {
            return $createAdminWriteCountController()->stats($request, $response);
        });
    });

    $app->group('/layouts', function (RouteCollectorProxy $app) use ($createAdminLayoutController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminLayoutController) {
            return $createAdminLayoutController()->list($request, $response);
        });
        $app->get('/{page_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminLayoutController) {
            return $createAdminLayoutController()->detail($request, $response, $args);
        });
        $app->put('/{page_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminLayoutController) {
            return $createAdminLayoutController()->save($request, $response, $args);
        });
        $app->post('/{page_id}/widgets', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminLayoutController) {
            return $createAdminLayoutController()->addWidget($request, $response, $args);
        });
        $app->patch('/{page_id}/widgets', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminLayoutController) {
            return $createAdminLayoutController()->reorder($request, $response, $args);
        });
        $app->patch('/{page_id}/widgets/{widget_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminLayoutController) {
            return $createAdminLayoutController()->updateWidget($request, $response, $args);
        });
        $app->delete('/{page_id}/widgets/{widget_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminLayoutController) {
            return $createAdminLayoutController()->deleteWidget($request, $response, $args);
        });
        $app->patch('/{page_id}/reorder', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminLayoutController) {
            return $createAdminLayoutController()->reorder($request, $response, $args);
        });
    });

    $app->group('/reports', function (RouteCollectorProxy $app) use ($createAdminReportController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminReportController) {
            return $createAdminReportController()->list($request, $response);
        });
        $app->patch('/{report_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminReportController) {
            return $createAdminReportController()->update($request, $response, $args);
        });
        $app->get('/stats', function (RequestInterface $request, ResponseInterface $response) use ($createAdminReportController) {
            return $createAdminReportController()->stats($request, $response);
        });
    });
};
