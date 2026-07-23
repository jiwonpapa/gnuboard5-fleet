<?php

/**
 * PostController API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Post\Controller
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Post\Controller;

use Api\Post\Service\PostService;
use Api\Post\Service\Support\PostPublicPresenter;
use Api\Support\Exception\ApiException;
use Api\Support\Http\ApiResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class PostController
{
    private readonly PostPublicPresenter $presenter;

    public function __construct(
        private readonly PostService $postService,
        ?PostPublicPresenter $presenter = null,
    ) {
        $this->presenter = $presenter ?? new PostPublicPresenter();
    }

    public function list(Request $request, Response $response, array $args): Response
    {
        $query = $request->getQueryParams();
        $boTable = (string)($args['bo_table'] ?? '');
        $page = $this->toPositiveInt($query['page'] ?? 1, 1);
        $perPage = $this->toPositiveInt($query['per_page'] ?? 20, 20);
        $sort = isset($query['sort']) && is_string($query['sort']) ? trim((string)$query['sort']) : null;
        $member = (array)($request->getAttribute('auth_member', []));

        $result = $this->postService->listPosts(
            $boTable,
            $page,
            $perPage,
            is_string($query['category'] ?? null) ? (string)$query['category'] : null,
            is_string($query['search_field'] ?? null) ? (string)$query['search_field'] : null,
            is_string($query['search'] ?? null) ? (string)$query['search'] : null,
            $sort,
            $member
        );

        $total = (int)($result['pagination']['total'] ?? 0);
        $lastPage = (int)ceil($total / max(1, $perPage));

        $items = [];
        foreach ($result['items'] as $post) {
            $items[] = $this->presenter->present($post);
        }

        return ApiResponse::envelope($response, $items, [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => $lastPage,
            'has_next' => $page < $lastPage,
            'has_prev' => $page > 1,
        ]);
    }

    public function detail(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $wrId = $this->toPositiveInt((string)($args['wr_id'] ?? '0'), null);

        $member = (array)($request->getAttribute('auth_member', []));
        if (!($member['mb_id'] ?? null)) {
            $member = [];
        }

        $post = $this->postService->getPost($boTable, $wrId, $member);
        $this->postService->increaseHit($boTable, $wrId);

        return ApiResponse::envelope($response, $this->presenter->present($post));
    }

    public function create(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $body = ApiResponse::parseJsonBody($request);
        $member = (array)$request->getAttribute('auth_member', []);

        $ip = (string)($request->getAttribute('client_ip', '') ?: ($request->getServerParams()['REMOTE_ADDR'] ?? ''));
        $postId = $this->postService->createPost($boTable, $member, $body, $ip);

        $location = '/api/v1/boards/' . rawurlencode($boTable) . '/posts/' . $postId;
        $response = $response->withHeader('Location', $location);

        return ApiResponse::envelope($response, [
            'wr_id' => $postId,
            'bo_table' => $boTable,
        ], null, [], 201);
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $wrId = $this->toPositiveInt((string)($args['wr_id'] ?? '0'), null);
        $body = ApiResponse::parseJsonBody($request);
        $member = (array)$request->getAttribute('auth_member', []);

        $this->postService->updatePost($boTable, $wrId, $member, $body);
        $post = $this->postService->getPost($boTable, $wrId, $member);

        return ApiResponse::envelope($response, $this->presenter->present($post));
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $wrId = $this->toPositiveInt((string)($args['wr_id'] ?? '0'), null);
        $member = (array)$request->getAttribute('auth_member', []);

        $this->postService->deletePost($boTable, $wrId, $member);
        return $response->withStatus(204);
    }

    public function scrap(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $wrId = $this->toPositiveInt((string)($args['wr_id'] ?? '0'), null);
        $member = (array)$request->getAttribute('auth_member', []);

        $result = $this->postService->addScrap($boTable, $wrId, $member);
        $location = '/api/v1/boards/' . rawurlencode($boTable) . '/posts/' . $wrId . '/scrap';

        return ApiResponse::envelope($response, $result, null, [], 201)
            ->withHeader('Location', $location);
    }

    public function unscrap(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $wrId = $this->toPositiveInt((string)($args['wr_id'] ?? '0'), null);
        $member = (array)$request->getAttribute('auth_member', []);

        $this->postService->removeScrap($boTable, $wrId, $member);
        return $response->withStatus(204);
    }

    public function myScraps(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $query = $request->getQueryParams();
        $page = $this->toPositiveInt($query['page'] ?? 1, 1);
        $perPage = $this->toPositiveInt($query['per_page'] ?? 20, 20);
        $cursor = is_string($query['cursor'] ?? null) ? trim((string)$query['cursor']) : null;

        $result = $this->postService->listMyScraps($member, $page, $perPage, $cursor);
        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function newPosts(Request $request, Response $response): Response
    {
        $member = (array)($request->getAttribute('auth_member', []));
        if (!($member['mb_id'] ?? null)) {
            $member = [];
        }

        $result = $this->postService->listNewPosts($request->getQueryParams(), $member);
        return ApiResponse::envelope($response, $result['items'], $result['pagination']);
    }

    public function deleteNewPosts(Request $request, Response $response): Response
    {
        $member = (array)$request->getAttribute('auth_member', []);
        $payload = ApiResponse::parseJsonBody($request);
        $unknown = array_values(array_diff(array_keys($payload), ['bn_ids']));
        if ($unknown !== []) {
            throw ApiException::badRequest('지원하지 않는 최근글 삭제 요청 필드가 포함되어 있습니다.');
        }
        if (!isset($payload['bn_ids']) || !is_array($payload['bn_ids'])) {
            throw ApiException::badRequest('bn_ids는 1개 이상의 정수 배열이어야 합니다.');
        }
        $bnIds = $payload['bn_ids'];

        $result = $this->postService->deleteNewPosts($member, $bnIds);
        return ApiResponse::envelope($response, $result);
    }

    public function vote(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $wrId = $this->toPositiveInt((string)($args['wr_id'] ?? '0'), null);
        $body = ApiResponse::parseJsonBody($request);
        $member = (array)$request->getAttribute('auth_member', []);

        $result = $this->postService->votePost($boTable, $wrId, $member, $body);
        return ApiResponse::envelope($response, $result);
    }

    public function reply(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $wrId = $this->toPositiveInt((string)($args['wr_id'] ?? '0'), null);
        $body = ApiResponse::parseJsonBody($request);
        $member = (array)$request->getAttribute('auth_member', []);
        $ip = (string)($request->getAttribute('client_ip', '') ?: ($request->getServerParams()['REMOTE_ADDR'] ?? ''));

        $replyId = $this->postService->createReply($boTable, $wrId, $member, $body, $ip);

        $location = '/api/v1/boards/' . rawurlencode($boTable) . '/posts/' . $replyId;
        $response = $response->withHeader('Location', $location);

        return ApiResponse::envelope($response, [
            'wr_id' => $replyId,
            'bo_table' => $boTable,
            'parent_wr_id' => $wrId,
        ], null, [], 201);
    }

    public function openLink(Request $request, Response $response, array $args): Response
    {
        $boTable = (string)($args['bo_table'] ?? '');
        $wrId = $this->toPositiveInt((string)($args['wr_id'] ?? '0'), null);
        $linkNo = $this->toPositiveInt((string)($args['link_no'] ?? '0'), null);
        $member = (array)($request->getAttribute('auth_member', []));

        $url = $this->postService->openLink($boTable, $wrId, $linkNo, $member);

        return $response
            ->withHeader('Location', $url)
            ->withStatus(302);
    }

    private function toPositiveInt(mixed $value, ?int $default): int
    {
        $value = is_int($value) ? $value : (is_numeric($value) ? (int)$value : null);
        if ($value === null || $value <= 0) {
            if ($default === null) {
                throw ApiException::badRequest('wr_id는 1 이상의 정수여야 합니다.');
            }

            return $default;
        }

        return $value;
    }
}
