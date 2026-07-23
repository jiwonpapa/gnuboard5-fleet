<?php

/**
 * PostReadService API module.
 *
 * @package  Gnuboard5\Api\v1\Post\Service
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Post\Service;

use Api\Board\Service\BoardService;
use Api\Core\Enum\VoteType;
use Api\Integration\Contracts\BoardGateway;
use Api\Post\Contracts\PostGateway;
use Api\Post\Service\Support\PostReadContextResolver;
use Api\Post\Service\Support\PostReadResultBuilder;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\BoTable;

final class PostReadService
{
    private const MAX_LIST_LENGTH = 100;

    private ?PostReadContextResolver $resolvedContextResolver = null;
    private ?PostReadResultBuilder $resolvedResultBuilder = null;

    public function __construct(
        private readonly PostGateway $postGateway,
        private readonly BoardService $boardService,
        private readonly BoardGateway $boardGateway,
        private readonly PostPermissionService $permissionService,
        private readonly PostPointService $pointService,
        ?PostReadContextResolver $contextResolver = null,
        ?PostReadResultBuilder $resultBuilder = null
    ) {
        $this->resolvedContextResolver = $contextResolver;
        $this->resolvedResultBuilder = $resultBuilder;
    }

    public function listPosts(
        string $boTable,
        int $page,
        int $perPage,
        ?string $category,
        ?string $searchField,
        ?string $search,
        ?string $sort,
        array $member = []
    ): array {
        $context = $this->contextResolver()->resolveListContext($boTable, $member);
        $safeBoTable = $context['bo_table'];

        $safePage = max(1, $page);
        $safePerPage = max(1, min(self::MAX_LIST_LENGTH, $perPage));
        $result = $this->postGateway->listPosts(
            $safeBoTable,
            $safePage,
            $safePerPage,
            $this->permissionService->sanitizeLegacyKeyword($category),
            $this->permissionService->normalizeSearchField($searchField),
            $this->permissionService->sanitizeLegacyKeyword($search),
            $sort
        );

        return $this->resultBuilder()->buildListPosts($result, $safePage, $safePerPage);
    }

    public function getPost(string $boTable, int $wrId, array $member = []): array
    {
        $context = $this->contextResolver()->resolveReadablePost($boTable, $wrId, $member);
        $this->pointService->applyReadPointIfNeeded(
            $context['bo_table'],
            $context['wr_id'],
            $context['post'],
            $member,
            $context['board']
        );

        return $context['post'];
    }

    public function listNewPosts(array $query, array $member = []): array
    {
        $config = $this->boardGateway->getConfig();
        $defaultPerPage = max(1, min(self::MAX_LIST_LENGTH, (int)($config['cf_new_rows'] ?? 20)));
        $inputPerPage = isset($query['per_page']) && is_numeric((string)$query['per_page']) ? (int)$query['per_page'] : $defaultPerPage;
        $perPage = max(1, min(self::MAX_LIST_LENGTH, $inputPerPage));
        $grId = $this->permissionService->normalizeGroupId($query['gr_id'] ?? null);
        $view = $this->permissionService->normalizeViewFilter($query['view'] ?? null);
        $mbId = $this->permissionService->normalizeMemberIdFilter($query['mb_id'] ?? null);
        $cursor = is_string($query['cursor'] ?? null) ? trim((string)$query['cursor']) : null;

        if (trim((string)$cursor) !== '') {
            $result = $this->postGateway->getNewPostsByCursor($perPage, $cursor, $grId, $view, $mbId);
            return $this->resultBuilder()->buildCursorNewPosts($result);
        }

        $page = max(1, (int)($query['page'] ?? 1));
        $result = $this->postGateway->getNewPosts(
            $page,
            $perPage,
            $grId,
            $view,
            $mbId
        );

        return $this->resultBuilder()->buildPagedNewPosts($result, $page, $perPage);
    }

    public function votePost(string $boTable, int $wrId, array $member, array $payload): array
    {
        $safeBoTable = BoTable::normalize($boTable);
        if (!$this->boardService->isMemberAllowedForRead($member, $safeBoTable)) {
            throw ApiException::forbidden('해당 게시판 조회/이력 조회 권한이 없습니다.');
        }

        $voteType = VoteType::tryFrom(strtolower(trim((string)($payload['type'] ?? ''))));
        if (!$voteType instanceof VoteType) {
            throw ApiException::badRequest('type은 good 또는 nogood 이어야 합니다.');
        }

        return $this->postGateway->castVote(
            $safeBoTable,
            $this->permissionService->normalizeWrId($wrId),
            $member,
            $voteType->value
        );
    }

    public function increaseHit(string $boTable, int $wrId): void
    {
        $this->postGateway->increaseHit(BoTable::normalize($boTable), $this->permissionService->normalizeWrId($wrId));
    }

    public function openLink(string $boTable, int $wrId, int $linkNo, array $member = []): string
    {
        if (!in_array($linkNo, [1, 2], true)) {
            throw ApiException::badRequest('link_no는 1 또는 2만 가능합니다.');
        }

        $context = $this->contextResolver()->resolveReadablePost($boTable, $wrId, $member);

        $url = $this->postGateway->increaseLinkHit($context['bo_table'], $context['wr_id'], $linkNo);
        if ($url === null || trim($url) === '') {
            throw ApiException::notFound('요청한 링크를 찾을 수 없습니다.');
        }

        return $this->permissionService->normalizeRedirectUrl($url);
    }

    private function contextResolver(): PostReadContextResolver
    {
        if ($this->resolvedContextResolver instanceof PostReadContextResolver) {
            return $this->resolvedContextResolver;
        }

        $this->resolvedContextResolver = new PostReadContextResolver(
            $this->postGateway,
            $this->boardService,
            $this->boardGateway,
            $this->permissionService
        );

        return $this->resolvedContextResolver;
    }

    private function resultBuilder(): PostReadResultBuilder
    {
        if ($this->resolvedResultBuilder instanceof PostReadResultBuilder) {
            return $this->resolvedResultBuilder;
        }

        $this->resolvedResultBuilder = new PostReadResultBuilder();

        return $this->resolvedResultBuilder;
    }
}
