<?php

declare(strict_types=1);

use Api\Device\Controller\DeviceController;
use Api\Middlewares\JwtAuthMiddleware;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (RouteCollectorProxy $app, callable $resolve): void {
    $createDeviceController = static fn (): DeviceController => $resolve(DeviceController::class);
    $createJwtAuthMiddleware = static fn (): JwtAuthMiddleware => $resolve(JwtAuthMiddleware::class);

    $app->group('/devices', function (RouteCollectorProxy $app) use (
        $createDeviceController,
        $createJwtAuthMiddleware
    ) {
        $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createDeviceController) {
            return $createDeviceController()->register($request, $response);
        })->add($createJwtAuthMiddleware());

        $app->delete('/{token}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createDeviceController) {
            return $createDeviceController()->unregister($request, $response, $args);
        })->add($createJwtAuthMiddleware());
    });
};
