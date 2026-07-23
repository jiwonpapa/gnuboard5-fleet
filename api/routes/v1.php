<?php

/**
 * routes API 모듈 정의.
 *
 * @package  Gnuboard5\Api
 * @since    v1.0.0
 */

declare(strict_types=1);

use Api\Setup\Controller\SetupController;
use Slim\App;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (App $app) {
    $container = $app->getContainer();
    if ($container === null) {
        throw new \RuntimeException('Container is not configured.');
    }

    $resolve = static fn (string $id): mixed => $container->get($id);
    $createSetupController = static fn () => $resolve(SetupController::class);

    $app->get('/setup', function (RequestInterface $request, ResponseInterface $response) use ($createSetupController) {
        $controller = $createSetupController();

        return $controller->index($request, $response);
    });

    $modules = [
        'auth.php',
        'boards.php',
        'files.php',
        'devices.php',
        'members.php',
        'messaging.php',
        'discovery.php',
        'moderation.php',
        'admin-inspect.php',
        'admin.php',
    ];

    $app->group('/v1', function (RouteCollectorProxy $app) use ($resolve, $modules) {
        foreach ($modules as $module) {
            (require __DIR__ . '/v1/' . $module)($app, $resolve);
        }
    });
};
