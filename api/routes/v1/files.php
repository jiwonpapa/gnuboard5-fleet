<?php

declare(strict_types=1);

use Api\File\Controller\FileController;
use Api\Middlewares\JwtAuthMiddleware;
use Api\Middlewares\OptionalJwtAuthMiddleware;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (RouteCollectorProxy $app, callable $resolve): void {
    $createFileController = static fn (): FileController => $resolve(FileController::class);
    $createJwtAuthMiddleware = static fn (): JwtAuthMiddleware => $resolve(JwtAuthMiddleware::class);
    $createOptionalJwtAuthMiddleware = static fn (): OptionalJwtAuthMiddleware => $resolve(OptionalJwtAuthMiddleware::class);

    $app->group('/files', function (RouteCollectorProxy $app) use (
        $createFileController,
        $createJwtAuthMiddleware,
        $createOptionalJwtAuthMiddleware
    ) {
        $app->post('/upload', function (RequestInterface $request, ResponseInterface $response) use ($createFileController) {
            return $createFileController()->upload($request, $response);
        })->add($createJwtAuthMiddleware());

        $app->get('/{bo_table}/{wr_id}/{bf_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createFileController) {
            return $createFileController()->download($request, $response, $args);
        })->add($createOptionalJwtAuthMiddleware());
    });
};
