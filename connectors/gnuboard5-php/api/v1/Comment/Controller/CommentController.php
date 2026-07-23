<?php

/**
 * CommentController API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Comment\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Comment\Controller;

use Api\Comment\Service\CommentService;
use Api\Comment\Service\Support\CommentPresenter;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class CommentController
{
    private readonly CommentPresenter $presenter;

    public function __construct(
        private readonly CommentService $commentService,
        ?CommentPresenter $presenter = null,
    ) {
        $this->presenter = $presenter ?? new CommentPresenter();
    }

    public function list(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $postId = $this->toPositiveInt((string)($args['wr_id'] ?? '0'), null);

        $result = $this->commentService->listComments($boTable, $postId);

        $items = [];
        foreach ((array)($result['items'] ?? []) as $comment) {
            if (is_array($comment)) {
                $items[] = $this->presenter->present($comment);
            }
        }

        return ApiResponse::envelope($response, $items);
    }

    public function create(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $postId = $this->toPositiveInt((string)($args['wr_id'] ?? '0'), null);
        $body = ApiResponse::parseJsonBody($request);
        $member = (array)$request->getAttribute('auth_member', []);
        $ip = (string)($request->getAttribute('client_ip', '') ?: ($request->getServerParams()['REMOTE_ADDR'] ?? ''));

        $comment = $this->commentService->createComment($boTable, $postId, $member, $body, $ip);

        $commentId = (int)($comment['wr_id'] ?? 0);
        $response = $response
            ->withHeader('Location', '/api/v1/boards/' . rawurlencode($boTable) . '/posts/' . $postId . '/comments/' . $commentId)
            ->withStatus(201);

        return ApiResponse::envelope($response, $this->presenter->present($comment));
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $postId = $this->toPositiveInt((string)($args['wr_id'] ?? '0'), null);
        $commentId = $this->toPositiveInt((string)($args['comment_id'] ?? '0'), null);
        $body = ApiResponse::parseJsonBody($request);
        $member = (array)$request->getAttribute('auth_member', []);

        $comment = $this->commentService->updateComment($boTable, $postId, $commentId, $member, $body);
        return ApiResponse::envelope($response, $this->presenter->present($comment));
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $postId = $this->toPositiveInt((string)($args['wr_id'] ?? '0'), null);
        $commentId = $this->toPositiveInt((string)($args['comment_id'] ?? '0'), null);
        $member = (array)$request->getAttribute('auth_member', []);

        $this->commentService->deleteComment($boTable, $postId, $commentId, $member);

        return $response->withStatus(204);
    }

    private function toPositiveInt(mixed $value, ?int $default): int
    {
        $value = is_int($value) ? $value : (is_numeric($value) ? (int)$value : null);
        if ($value === null || $value <= 0) {
            if ($default === null) {
                throw \Api\Support\Exception\ApiException::badRequest('wr_id는 1 이상의 정수여야 합니다.');
            }

            return $default;
        }

        return $value;
    }
}
