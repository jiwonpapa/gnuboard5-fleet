<?php

declare(strict_types=1);

use Api\Admin\Config\Controller\AdminConfigController;
use Api\Admin\Member\Controller\AdminMemberController;
use Api\Admin\Point\Controller\AdminPointController;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (RouteCollectorProxy $app, callable $resolve, ?callable $isAdminSmsEnabled = null): void {
    unset($isAdminSmsEnabled);

    $createAdminMemberController = static fn (): AdminMemberController => $resolve(AdminMemberController::class);
    $createAdminConfigController = static fn (): AdminConfigController => $resolve(AdminConfigController::class);
    $createAdminPointController = static fn (): AdminPointController => $resolve(AdminPointController::class);

    $app->group('/members', function (RouteCollectorProxy $app) use ($createAdminMemberController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminMemberController) {
            return $createAdminMemberController()->list($request, $response);
        });
        $app->get('/excel', function (RequestInterface $request, ResponseInterface $response) use ($createAdminMemberController) {
            return $createAdminMemberController()->exportExcel($request, $response);
        });
        $app->get('/{mb_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminMemberController) {
            return $createAdminMemberController()->detail($request, $response, $args);
        });
        $app->patch('/{mb_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminMemberController) {
            return $createAdminMemberController()->update($request, $response, $args);
        });
        $app->patch('/{mb_id}/level', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminMemberController) {
            return $createAdminMemberController()->updateLevel($request, $response, $args);
        });
        $app->delete('/{mb_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminMemberController) {
            return $createAdminMemberController()->delete($request, $response, $args);
        });
        $app->post('/{mb_id}/icon', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminMemberController) {
            return $createAdminMemberController()->uploadIcon($request, $response, $args);
        });
        $app->delete('/{mb_id}/icon', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminMemberController) {
            return $createAdminMemberController()->deleteIcon($request, $response, $args);
        });
        $app->post('/{mb_id}/image', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminMemberController) {
            return $createAdminMemberController()->uploadImage($request, $response, $args);
        });
        $app->delete('/{mb_id}/image', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminMemberController) {
            return $createAdminMemberController()->deleteImage($request, $response, $args);
        });
    });

    $app->get('/config', function (RequestInterface $request, ResponseInterface $response) use ($createAdminConfigController) {
        return $createAdminConfigController()->get($request, $response);
    });
    $app->put('/config', function (RequestInterface $request, ResponseInterface $response) use ($createAdminConfigController) {
        return $createAdminConfigController()->update($request, $response);
    });

    $app->group('/points', function (RouteCollectorProxy $app) use ($createAdminPointController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPointController) {
            return $createAdminPointController()->list($request, $response);
        });
        $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPointController) {
            return $createAdminPointController()->create($request, $response);
        });
        $app->get('/summary', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPointController) {
            return $createAdminPointController()->summary($request, $response);
        });
        $app->post('/grant', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPointController) {
            return $createAdminPointController()->grant($request, $response);
        });
        $app->post('/deduct', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPointController) {
            return $createAdminPointController()->deduct($request, $response);
        });
        $app->post('/expire', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPointController) {
            return $createAdminPointController()->expire($request, $response);
        });
        $app->delete('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminPointController) {
            return $createAdminPointController()->delete($request, $response);
        });
    });
};
