<?php

declare(strict_types=1);

use Api\Memo\Controller\MemoController;
use Api\Middlewares\JwtAuthMiddleware;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (RouteCollectorProxy $app, callable $resolve): void {
    $createMemoController = static fn (): MemoController => $resolve(MemoController::class);
    $createJwtAuthMiddleware = static fn (): JwtAuthMiddleware => $resolve(JwtAuthMiddleware::class);

    $app->group('/memos', function (RouteCollectorProxy $app) use (
        $createMemoController,
        $createJwtAuthMiddleware
    ) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createMemoController) {
            return $createMemoController()->list($request, $response);
        })->add($createJwtAuthMiddleware());

        $app->get('/unread-count', function (RequestInterface $request, ResponseInterface $response) use ($createMemoController) {
            return $createMemoController()->unreadCount($request, $response);
        })->add($createJwtAuthMiddleware());

        $app->get('/{me_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createMemoController) {
            return $createMemoController()->detail($request, $response, $args);
        })->add($createJwtAuthMiddleware());

        $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createMemoController) {
            return $createMemoController()->send($request, $response);
        })->add($createJwtAuthMiddleware());

        $app->delete('/{me_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createMemoController) {
            return $createMemoController()->delete($request, $response, $args);
        })->add($createJwtAuthMiddleware());
    });
};
