<?php

declare(strict_types=1);

use Api\Admin\Auth\Controller\AdminAuthController;
use Api\Admin\Dashboard\Controller\AdminDashboardController;
use Api\Admin\Mail\Controller\AdminMailController;
use Api\Admin\Schema\Controller\AdminSchemaController;
use Api\Qa\Controller\QaController;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (RouteCollectorProxy $app, callable $resolve, ?callable $isAdminSmsEnabled = null): void {
    unset($isAdminSmsEnabled);

    $createAdminAuthController = static fn (): AdminAuthController => $resolve(AdminAuthController::class);
    $createAdminDashboardController = static fn (): AdminDashboardController => $resolve(AdminDashboardController::class);
    $createAdminMailController = static fn (): AdminMailController => $resolve(AdminMailController::class);
    $createAdminSchemaController = static fn (): AdminSchemaController => $resolve(AdminSchemaController::class);
    $createQaController = static fn (): QaController => $resolve(QaController::class);

    $app->get('/dashboard', function (RequestInterface $request, ResponseInterface $response) use ($createAdminDashboardController) {
        return $createAdminDashboardController()->overview($request, $response);
    });

    $app->delete('/qa', function (RequestInterface $request, ResponseInterface $response) use ($createQaController) {
        return $createQaController()->bulkDelete($request, $response);
    });

    $app->group('/auth', function (RouteCollectorProxy $app) use ($createAdminAuthController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminAuthController) {
            return $createAdminAuthController()->list($request, $response);
        });
        $app->put('/{mb_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminAuthController) {
            return $createAdminAuthController()->upsert($request, $response, $args);
        });
        $app->delete('/{mb_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminAuthController) {
            return $createAdminAuthController()->deleteByMember($request, $response, $args);
        });
    });

    $app->post('/mail-tests', function (RequestInterface $request, ResponseInterface $response) use ($createAdminMailController) {
        return $createAdminMailController()->sendTest($request, $response);
    });

    $app->get('/schema', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSchemaController) {
        return $createAdminSchemaController()->list($request, $response);
    });
    $app->get('/schema/{domain}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSchemaController) {
        return $createAdminSchemaController()->get($request, $response, $args);
    });
};
