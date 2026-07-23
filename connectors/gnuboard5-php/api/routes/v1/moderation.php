<?php

declare(strict_types=1);

use Api\Block\Controller\BlockController;
use Api\Middlewares\JwtAuthMiddleware;
use Api\Qa\Controller\QaController;
use Api\Report\Controller\ReportController;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (RouteCollectorProxy $app, callable $resolve): void {
    $createQaController = static fn (): QaController => $resolve(QaController::class);
    $createReportController = static fn (): ReportController => $resolve(ReportController::class);
    $createBlockController = static fn (): BlockController => $resolve(BlockController::class);
    $createJwtAuthMiddleware = static fn (): JwtAuthMiddleware => $resolve(JwtAuthMiddleware::class);

    $app->group('/qa', function (RouteCollectorProxy $app) use (
        $createQaController,
        $createJwtAuthMiddleware
    ) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createQaController) {
            return $createQaController()->list($request, $response);
        })->add($createJwtAuthMiddleware());

        $app->get('/{qa_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createQaController) {
            return $createQaController()->detail($request, $response, $args);
        })->add($createJwtAuthMiddleware());

        $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createQaController) {
            return $createQaController()->create($request, $response);
        })->add($createJwtAuthMiddleware());

        $app->post('/{qa_id}/answer', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createQaController) {
            return $createQaController()->answer($request, $response, $args);
        })->add($createJwtAuthMiddleware());

        $app->post('/{qa_id}/related', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createQaController) {
            return $createQaController()->related($request, $response, $args);
        })->add($createJwtAuthMiddleware());

        $app->patch('/{qa_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createQaController) {
            return $createQaController()->update($request, $response, $args);
        })->add($createJwtAuthMiddleware());

        $app->delete('/{qa_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createQaController) {
            return $createQaController()->delete($request, $response, $args);
        })->add($createJwtAuthMiddleware());

        $app->get('/{qa_id}/files/{no}/download', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createQaController) {
            return $createQaController()->download($request, $response, $args);
        })->add($createJwtAuthMiddleware());
    });

    $app->post('/reports', function (RequestInterface $request, ResponseInterface $response) use ($createReportController) {
        return $createReportController()->create($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->group('/blocks', function (RouteCollectorProxy $app) use (
        $createBlockController,
        $createJwtAuthMiddleware
    ) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createBlockController) {
            return $createBlockController()->list($request, $response);
        })->add($createJwtAuthMiddleware());

        $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createBlockController) {
            return $createBlockController()->create($request, $response);
        })->add($createJwtAuthMiddleware());

        $app->delete('/{mb_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createBlockController) {
            return $createBlockController()->delete($request, $response, $args);
        })->add($createJwtAuthMiddleware());
    });
};
