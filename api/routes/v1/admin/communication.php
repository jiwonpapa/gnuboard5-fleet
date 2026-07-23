<?php

declare(strict_types=1);

use Api\Admin\Mail\Controller\AdminMailController;
use Api\Admin\Poll\Controller\AdminPollController;
use Api\Admin\Popup\Controller\AdminPopupController;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (RouteCollectorProxy $app, callable $resolve, ?callable $isAdminSmsEnabled = null): void {
    unset($isAdminSmsEnabled);

    $createAdminMailController = static fn (): AdminMailController => $resolve(AdminMailController::class);
    $createAdminPollController = static fn (): AdminPollController => $resolve(AdminPollController::class);
    $createAdminPopupController = static fn (): AdminPopupController => $resolve(AdminPopupController::class);

    $app->group('/polls', function (RouteCollectorProxy $app) use ($createAdminPollController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPollController) {
            return $createAdminPollController()->list($request, $response);
        });
        $app->get('/{po_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminPollController) {
            return $createAdminPollController()->detail($request, $response, $args);
        });
        $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPollController) {
            return $createAdminPollController()->create($request, $response);
        });
        $app->patch('/{po_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminPollController) {
            return $createAdminPollController()->update($request, $response, $args);
        });
        $app->delete('/{po_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminPollController) {
            return $createAdminPollController()->delete($request, $response, $args);
        });
    });

    $app->group('/popups', function (RouteCollectorProxy $app) use ($createAdminPopupController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPopupController) {
            return $createAdminPopupController()->list($request, $response);
        });
        $app->get('/{nw_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminPopupController) {
            return $createAdminPopupController()->detail($request, $response, $args);
        });
        $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPopupController) {
            return $createAdminPopupController()->create($request, $response);
        });
        $app->patch('/{nw_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminPopupController) {
            return $createAdminPopupController()->update($request, $response, $args);
        });
        $app->delete('/{nw_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminPopupController) {
            return $createAdminPopupController()->delete($request, $response, $args);
        });
    });

    $app->group('/mails', function (RouteCollectorProxy $app) use ($createAdminMailController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminMailController) {
            return $createAdminMailController()->list($request, $response);
        });
        $app->post('/templates', function (RequestInterface $request, ResponseInterface $response) use ($createAdminMailController) {
            return $createAdminMailController()->create($request, $response);
        });
        $app->get('/recipients', function (RequestInterface $request, ResponseInterface $response) use ($createAdminMailController) {
            return $createAdminMailController()->recipients($request, $response);
        });
        $app->get('/{ma_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminMailController) {
            return $createAdminMailController()->detail($request, $response, $args);
        });
        $app->put('/{ma_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminMailController) {
            return $createAdminMailController()->update($request, $response, $args);
        });
        $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminMailController) {
            return $createAdminMailController()->send($request, $response);
        });
        $app->post('/test', function (RequestInterface $request, ResponseInterface $response) use ($createAdminMailController) {
            return $createAdminMailController()->sendTest($request, $response);
        });
        $app->delete('/{ma_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminMailController) {
            return $createAdminMailController()->delete($request, $response, $args);
        });
    });
};
