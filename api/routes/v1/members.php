<?php

declare(strict_types=1);

use Api\Member\Controller\MemberController;
use Api\Middlewares\JwtAuthMiddleware;
use Api\Middlewares\OptionalJwtAuthMiddleware;
use Api\Notification\Controller\NotificationController;
use Api\Point\Controller\PointController;
use Api\Post\Controller\PostController;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (RouteCollectorProxy $app, callable $resolve): void {
    $createMemberController = static fn (): MemberController => $resolve(MemberController::class);
    $createNotificationController = static fn (): NotificationController => $resolve(NotificationController::class);
    $createPointController = static fn (): PointController => $resolve(PointController::class);
    $createPostController = static fn (): PostController => $resolve(PostController::class);
    $createJwtAuthMiddleware = static fn (): JwtAuthMiddleware => $resolve(JwtAuthMiddleware::class);
    $createOptionalJwtAuthMiddleware = static fn (): OptionalJwtAuthMiddleware => $resolve(OptionalJwtAuthMiddleware::class);

    $app->get('/members/me', function (RequestInterface $request, ResponseInterface $response) use ($createMemberController) {
        return $createMemberController()->me($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->patch('/members/me', function (RequestInterface $request, ResponseInterface $response) use ($createMemberController) {
        return $createMemberController()->updateMe($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->delete('/members/me', function (RequestInterface $request, ResponseInterface $response) use ($createMemberController) {
        return $createMemberController()->withdraw($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->post('/members/me/icon', function (RequestInterface $request, ResponseInterface $response) use ($createMemberController) {
        return $createMemberController()->uploadMyIcon($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->delete('/members/me/icon', function (RequestInterface $request, ResponseInterface $response) use ($createMemberController) {
        return $createMemberController()->deleteMyIcon($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->post('/members/me/image', function (RequestInterface $request, ResponseInterface $response) use ($createMemberController) {
        return $createMemberController()->uploadMyImage($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->delete('/members/me/image', function (RequestInterface $request, ResponseInterface $response) use ($createMemberController) {
        return $createMemberController()->deleteMyImage($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->get('/members/me/points', function (RequestInterface $request, ResponseInterface $response) use ($createPointController) {
        return $createPointController()->listMyPoints($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->get('/members/me/scraps', function (RequestInterface $request, ResponseInterface $response) use ($createPostController) {
        return $createPostController()->myScraps($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->get('/members/me/notifications', function (RequestInterface $request, ResponseInterface $response) use ($createNotificationController) {
        return $createNotificationController()->listMy($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->patch('/members/me/notifications/settings', function (RequestInterface $request, ResponseInterface $response) use ($createNotificationController) {
        return $createNotificationController()->updateSettings($request, $response);
    })->add($createJwtAuthMiddleware());

    $app->get('/members/{mb_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createMemberController) {
        return $createMemberController()->getPublicProfile($request, $response, $args);
    })->add($createOptionalJwtAuthMiddleware());
};
