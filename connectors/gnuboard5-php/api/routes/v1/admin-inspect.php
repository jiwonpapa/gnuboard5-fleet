<?php

declare(strict_types=1);

use Api\Admin\Dev\Middleware\AdminSchemaInspectMiddleware;
use Api\Admin\Dev\Support\DbTableObservationBuilder;
use Api\Admin\Config\Controller\AdminConfigController;
use Api\Admin\Member\Controller\AdminMemberController;
use Api\Admin\Schema\Controller\AdminSchemaController;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (
    RouteCollectorProxy $app,
    callable $resolve
): void {
    $createAdminSchemaController = static fn (): AdminSchemaController => $resolve(AdminSchemaController::class);
    $createAdminConfigController = static fn (): AdminConfigController => $resolve(AdminConfigController::class);
    $createAdminMemberController = static fn (): AdminMemberController => $resolve(AdminMemberController::class);
    $createDbTableObservationBuilder = static fn (): DbTableObservationBuilder => $resolve(DbTableObservationBuilder::class);
    $createAdminSchemaInspectMiddleware = static fn (): AdminSchemaInspectMiddleware => $resolve(AdminSchemaInspectMiddleware::class);

    $app->group('/admin-inspect', function (RouteCollectorProxy $app) use ($createAdminSchemaController, $createAdminConfigController, $createAdminMemberController, $createDbTableObservationBuilder) {
        $app->get('/schema', function (RequestInterface $request, ResponseInterface $response) use ($createAdminSchemaController) {
            return $createAdminSchemaController()->list($request, $response);
        });
        $app->get('/schema/{domain}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminSchemaController) {
            return $createAdminSchemaController()->get($request, $response, $args);
        });
        $app->get('/config', function (RequestInterface $request, ResponseInterface $response) use ($createAdminConfigController) {
            return $createAdminConfigController()->get($request, $response);
        });
        $app->get('/members', function (RequestInterface $request, ResponseInterface $response) use ($createAdminMemberController) {
            return $createAdminMemberController()->list($request, $response);
        });
        $app->get('/members/{mb_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminMemberController) {
            return $createAdminMemberController()->detail($request, $response, $args);
        });
        $app->get('/db/{table}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createDbTableObservationBuilder) {
            $table = trim((string)($args['table'] ?? ''));
            $sampleLimit = max(1, (int)($request->getQueryParams()['sample_limit'] ?? 1));
            $payload = $createDbTableObservationBuilder()->build($table, $sampleLimit);
            $response->getBody()->write((string)json_encode(
                $payload,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ));
            return $response->withHeader('Content-Type', 'application/json');
        });
    })->add($createAdminSchemaInspectMiddleware());
};
