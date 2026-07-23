<?php

declare(strict_types=1);

use Api\Board\Controller\BoardController;
use Api\Comment\Controller\CommentController;
use Api\File\Controller\FileController;
use Api\Like\Controller\LikeController;
use Api\Middlewares\JwtAuthMiddleware;
use Api\Middlewares\OptionalJwtAuthMiddleware;
use Api\Post\Controller\PostController;
use Psr\Http\Message\ResponseInterface as ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as RequestInterface;
use Slim\Routing\RouteCollectorProxy;

return function (
    RouteCollectorProxy $app,
    callable $resolve
): void {
    $createBoardController = static fn (): BoardController => $resolve(BoardController::class);
    $createPostController = static fn (): PostController => $resolve(PostController::class);
    $createFileController = static fn (): FileController => $resolve(FileController::class);
    $createCommentController = static fn (): CommentController => $resolve(CommentController::class);
    $createLikeController = static fn (): LikeController => $resolve(LikeController::class);
    $createJwtAuthMiddleware = static fn (): JwtAuthMiddleware => $resolve(JwtAuthMiddleware::class);
    $createOptionalJwtAuthMiddleware = static fn (): OptionalJwtAuthMiddleware => $resolve(OptionalJwtAuthMiddleware::class);

    $commentControllerFactory = $createCommentController;
    $likeControllerFactory = $createLikeController;

    $app->group('/boards', function (RouteCollectorProxy $app) use (
        $createBoardController,
        $createPostController,
        $createFileController,
        $commentControllerFactory,
        $likeControllerFactory,
        $createJwtAuthMiddleware,
        $createOptionalJwtAuthMiddleware
    ) {
        $app->get('', function (RequestInterface $request, ResponseInterface $response) use ($createBoardController) {
            $controller = $createBoardController();
            return $controller->list($request, $response);
        });

        $app->get('/new-posts', function (RequestInterface $request, ResponseInterface $response) use ($createPostController) {
            return $createPostController()->newPosts($request, $response);
        })->add($createOptionalJwtAuthMiddleware());

        $app->get('/{bo_table}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createBoardController) {
            $controller = $createBoardController();
            return $controller->detail($request, $response, $args);
        });

        $app->group('/{bo_table}/posts', function (RouteCollectorProxy $app) use (
            $createPostController,
            $createFileController,
            $commentControllerFactory,
            $likeControllerFactory,
            $createJwtAuthMiddleware,
            $createOptionalJwtAuthMiddleware
        ) {
            $app->get('', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createPostController) {
                $controller = $createPostController();
                return $controller->list($request, $response, $args);
            })->add($createOptionalJwtAuthMiddleware());

            $app->get('/{wr_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createPostController) {
                $controller = $createPostController();
                return $controller->detail($request, $response, $args);
            })->add($createOptionalJwtAuthMiddleware());

            $app->post('', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createPostController) {
                $controller = $createPostController();
                return $controller->create($request, $response, $args);
            })->add($createJwtAuthMiddleware());

            $app->post('/{wr_id}/reply', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createPostController) {
                $controller = $createPostController();
                return $controller->reply($request, $response, $args);
            })->add($createJwtAuthMiddleware());

            $app->put('/{wr_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createPostController) {
                $controller = $createPostController();
                return $controller->update($request, $response, $args);
            })->add($createJwtAuthMiddleware());

            $app->delete('/{wr_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createPostController) {
                $controller = $createPostController();
                return $controller->delete($request, $response, $args);
            })->add($createJwtAuthMiddleware());

            $app->post('/{wr_id}/scrap', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createPostController) {
                return $createPostController()->scrap($request, $response, $args);
            })->add($createJwtAuthMiddleware());

            $app->delete('/{wr_id}/scrap', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createPostController) {
                return $createPostController()->unscrap($request, $response, $args);
            })->add($createJwtAuthMiddleware());

            $app->post('/{wr_id}/good', function (RequestInterface $request, ResponseInterface $response, array $args) use ($likeControllerFactory) {
                $controller = $likeControllerFactory();
                return $controller->vote($request, $response, $args);
            })->add($createJwtAuthMiddleware());

            $app->get('/{wr_id}/link/{link_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createPostController) {
                $controller = $createPostController();
                return $controller->openLink($request, $response, $args);
            })->add($createOptionalJwtAuthMiddleware());

            $app->group('/{wr_id}/files', function (RouteCollectorProxy $app) use (
                $createFileController,
                $createJwtAuthMiddleware,
                $createOptionalJwtAuthMiddleware
            ) {
                $app->get('', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createFileController) {
                    $controller = $createFileController();
                    return $controller->listByPost($request, $response, $args);
                })->add($createOptionalJwtAuthMiddleware());

                $app->post('', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createFileController) {
                    $controller = $createFileController();
                    return $controller->uploadToPost($request, $response, $args);
                })->add($createJwtAuthMiddleware());

                $app->get('/{bf_no}/download', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createFileController) {
                    $controller = $createFileController();
                    return $controller->downloadByPost($request, $response, $args);
                })->add($createOptionalJwtAuthMiddleware());

                $app->delete('/{bf_no}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($createFileController) {
                    $controller = $createFileController();
                    return $controller->deleteByPost($request, $response, $args);
                })->add($createJwtAuthMiddleware());
            });

            $app->group('/{wr_id}/comments', function (RouteCollectorProxy $app) use (
                $commentControllerFactory,
                $createJwtAuthMiddleware
            ) {
                $app->get('', function (RequestInterface $request, ResponseInterface $response, array $args) use ($commentControllerFactory) {
                    $controller = $commentControllerFactory();
                    return $controller->list($request, $response, $args);
                });

                $app->post('', function (RequestInterface $request, ResponseInterface $response, array $args) use ($commentControllerFactory) {
                    $controller = $commentControllerFactory();
                    return $controller->create($request, $response, $args);
                })->add($createJwtAuthMiddleware());

                $app->put('/{comment_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($commentControllerFactory) {
                    $controller = $commentControllerFactory();
                    return $controller->update($request, $response, $args);
                })->add($createJwtAuthMiddleware());

                $app->delete('/{comment_id}', function (RequestInterface $request, ResponseInterface $response, array $args) use ($commentControllerFactory) {
                    $controller = $commentControllerFactory();
                    return $controller->delete($request, $response, $args);
                })->add($createJwtAuthMiddleware());
            });
        });
    });
};
