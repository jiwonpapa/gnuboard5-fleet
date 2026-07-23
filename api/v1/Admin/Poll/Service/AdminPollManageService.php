<?php

/**
 * AdminPollManageService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Poll\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Poll\Service;

use Api\Admin\Poll\Repository\AdminPollRepository;
use Api\Admin\Poll\Service\Support\AdminPollAccessPolicy;
use Api\Admin\Poll\Service\Support\AdminPollInputNormalizer;
use Api\Admin\Poll\Service\Support\AdminPollPresenter;
use Api\Support\Exception\ApiException;

final class AdminPollManageService
{
    private readonly AdminPollAccessPolicy $accessPolicy;
    private readonly AdminPollInputNormalizer $input;
    private readonly AdminPollPresenter $presenter;

    public function __construct(
        private readonly AdminPollRepository $repository,
        private readonly AdminPollResultService $resultService
    ) {
        $this->accessPolicy = new AdminPollAccessPolicy();
        $this->input = new AdminPollInputNormalizer();
        $this->presenter = new AdminPollPresenter();
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listAdmin(array $member, array $query): array
    {
        $this->accessPolicy->assertSuperAdmin($member);
        $listInput = $this->input->normalizeListQuery($query);
        $page = $listInput['page'];
        $perPage = $listInput['per_page'];
        $result = $this->repository->list($page, $perPage);
        $total = (int)($result['total'] ?? 0);
        $lastPage = (int)ceil($total / max(1, $perPage));
        $items = [];
        foreach ($result['items'] as $row) {
            $items[] = $this->presenter->present($row);
        }

        return [
            'items' => $items,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => $lastPage,
                'has_next' => $page < $lastPage,
                'has_prev' => $page > 1,
            ],
        ];
    }

    /**
     * @param array<string,mixed> $member
     */
    public function detailAdmin(array $member, int $pollId): array
    {
        $this->accessPolicy->assertSuperAdmin($member);

        $poll = $this->repository->find($this->input->requirePollId($pollId));
        if ($poll === null) {
            throw ApiException::notFound('투표를 찾을 수 없습니다.');
        }

        return $this->presenter->present($poll);
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $payload
     */
    public function createAdmin(array $member, array $payload): array
    {
        $this->accessPolicy->assertSuperAdmin($member);
        $normalized = $this->input->normalizeCreatePayload($payload);
        $pollId = $this->repository->create($normalized);

        return $this->detailAdmin($member, $pollId);
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $payload
     */
    public function updateAdmin(int $pollId, array $member, array $payload): array
    {
        $this->accessPolicy->assertSuperAdmin($member);
        $id = $this->input->requirePollId($pollId);
        if ($this->repository->find($id) === null) {
            throw ApiException::notFound('투표를 찾을 수 없습니다.');
        }

        $normalized = $this->input->normalizeUpdatePayload($payload);
        if ($normalized === []) {
            throw ApiException::badRequest('수정할 필드가 없습니다.');
        }

        if ($this->repository->update($id, $normalized) <= 0) {
            throw ApiException::badRequest('수정할 필드가 없습니다.');
        }

        return $this->detailAdmin($member, $id);
    }

    /**
     * @param array<string,mixed> $member
     */
    public function deleteAdmin(int $pollId, array $member): void
    {
        $this->accessPolicy->assertSuperAdmin($member);
        $id = $this->input->requirePollId($pollId);
        if ($this->repository->delete($id) <= 0) {
            throw ApiException::notFound('투표를 찾을 수 없습니다.');
        }
    }

    /**
     * @return array<string,mixed>
     */
    public function result(int $pollId, bool $includeEtc = true): array
    {
        return $this->resultService->result($pollId, $includeEtc);
    }
}
