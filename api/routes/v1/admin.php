<?php

declare(strict_types=1);

use Api\Core\Config\EnvConfig;
use Api\Core\Middleware\AdminGuardMiddleware;
use Api\Middlewares\JwtAuthMiddleware;
use Slim\Routing\RouteCollectorProxy;

return function (
    RouteCollectorProxy $app,
    callable $resolve
): void {
    $createJwtAuthMiddleware = static fn (): JwtAuthMiddleware => $resolve(JwtAuthMiddleware::class);
    $createAdminGuardMiddleware = static fn (): AdminGuardMiddleware => $resolve(AdminGuardMiddleware::class);
    $createEnvConfig = static fn (): EnvConfig => $resolve(EnvConfig::class);
    $isAdminSmsEnabled = static fn (): bool => $createEnvConfig()->adminSmsEnabled;

    $modules = [
        'core.php',
        'communication.php',
        'board.php',
        'members.php',
        'content.php',
        'shop-catalog.php',
        'system.php',
    ];

    $app->group('/admin', function (RouteCollectorProxy $app) use ($modules, $resolve, $isAdminSmsEnabled) {
        foreach ($modules as $module) {
            (require __DIR__ . '/admin/' . $module)($app, $resolve, $isAdminSmsEnabled);
        }
    })->add($createAdminGuardMiddleware())->add($createJwtAuthMiddleware());
};
