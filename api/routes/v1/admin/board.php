<?php

declare(strict_types=1);

use Api\Admin\Board\Controller\AdminBoardController;
use Api\Admin\Group\Controller\AdminGroupController;
use Api\Post\Controller\PostController;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (RouteCollectorProxy $app, callable $resolve, ?callable $isAdminSmsEnabled = null): void {
    unset($isAdminSmsEnabled);

    $createAdminBoardController = static fn (): AdminBoardController => $resolve(AdminBoardController::class);
    $createAdminGroupController = static fn (): AdminGroupController => $resolve(AdminGroupController::class);
    $createPostController = static fn (): PostController => $resolve(PostController::class);

    $app->group('/boards', function (RouteCollectorProxy $app) use ($createAdminBoardController, $createPostController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminBoardController) {
            return $createAdminBoardController()->list($request, $response);
        });
        $app->delete('/new-posts', function (RequestInterface $request, ResponseInterface $response) use ($createPostController) {
            return $createPostController()->deleteNewPosts($request, $response);
        });
        $app->get('/{bo_table}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminBoardController) {
            return $createAdminBoardController()->detail($request, $response, $args);
        });
        $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminBoardController) {
            return $createAdminBoardController()->create($request, $response);
        });
        $app->put('/{bo_table}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminBoardController) {
            return $createAdminBoardController()->update($request, $response, $args);
        });
        $app->delete('/{bo_table}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminBoardController) {
            return $createAdminBoardController()->delete($request, $response, $args);
        });
        $app->post('/{bo_table}/copy', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminBoardController) {
            return $createAdminBoardController()->copy($request, $response, $args);
        });
    });

    $app->group('/groups', function (RouteCollectorProxy $app) use ($createAdminGroupController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminGroupController) {
            return $createAdminGroupController()->list($request, $response);
        });
        $app->get('/{gr_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminGroupController) {
            return $createAdminGroupController()->detail($request, $response, $args);
        });
        $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminGroupController) {
            return $createAdminGroupController()->create($request, $response);
        });
        $app->put('/{gr_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminGroupController) {
            return $createAdminGroupController()->update($request, $response, $args);
        });
        $app->delete('/{gr_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminGroupController) {
            return $createAdminGroupController()->delete($request, $response, $args);
        });
        $app->get('/{gr_id}/members', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminGroupController) {
            return $createAdminGroupController()->listMembers($request, $response, $args);
        });
        $app->post('/{gr_id}/members', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminGroupController) {
            return $createAdminGroupController()->addMember($request, $response, $args);
        });
        $app->delete('/{gr_id}/members/{mb_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminGroupController) {
            return $createAdminGroupController()->removeMember($request, $response, $args);
        });
    });

    $app->group('/board-groups', function (RouteCollectorProxy $app) use ($createAdminGroupController) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminGroupController) {
            return $createAdminGroupController()->list($request, $response);
        });
        $app->get('/{gr_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminGroupController) {
            return $createAdminGroupController()->detail($request, $response, $args);
        });
        $app->post('', function (RequestInterface $request, ResponseInterface $response) use ($createAdminGroupController) {
            return $createAdminGroupController()->create($request, $response);
        });
        $app->put('/{gr_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminGroupController) {
            return $createAdminGroupController()->update($request, $response, $args);
        });
        $app->patch('/{gr_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminGroupController) {
            return $createAdminGroupController()->update($request, $response, $args);
        });
        $app->delete('/{gr_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminGroupController) {
            return $createAdminGroupController()->delete($request, $response, $args);
        });
        $app->get('/{gr_id}/members', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminGroupController) {
            return $createAdminGroupController()->listMembers($request, $response, $args);
        });
        $app->post('/{gr_id}/members', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminGroupController) {
            return $createAdminGroupController()->addMember($request, $response, $args);
        });
        $app->delete('/{gr_id}/members/{mb_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createAdminGroupController) {
            return $createAdminGroupController()->removeMember($request, $response, $args);
        });
    });
};
