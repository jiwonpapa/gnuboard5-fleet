<?php

/**
 * AdminGroupService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Group\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Group\Service;

use Api\Admin\Group\Repository\AdminGroupRepository;
use Api\Admin\Group\Service\Support\AdminGroupInputNormalizer;
use Api\Admin\Group\Service\Support\AdminGroupPresenter;
use Api\Support\Exception\ApiException;

final class AdminGroupService
{
    private ?AdminGroupInputNormalizer $resolvedInput = null;
    private ?AdminGroupMemberService $resolvedMemberService = null;

    public function __construct(private readonly AdminGroupRepository $repository)
    {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        return array_map(
            static fn (array $group): array => AdminGroupPresenter::group($group),
            $this->repository->list()
        );
    }

    public function detail(string $groupId): array
    {
        $group = $this->repository->find($this->input()->normalizeGroupId($groupId));
        if ($group === null) {
            throw ApiException::notFound('그룹을 찾을 수 없습니다.');
        }

        return AdminGroupPresenter::group($group);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(array $payload): array
    {
        $normalizedPayload = $this->input()->normalizeCreatePayload($payload);
        $groupId = $normalizedPayload['gr_id'];

        if ($this->repository->find($groupId) !== null) {
            throw ApiException::conflict('이미 존재하는 그룹입니다.');
        }

        $this->repository->create($normalizedPayload);

        $created = $this->repository->find($groupId);
        if ($created === null) {
            throw ApiException::serverError('그룹 생성 후 조회에 실패했습니다.');
        }

        return AdminGroupPresenter::group($created);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(string $groupId, array $payload): array
    {
        $normalized = $this->input()->normalizeGroupId($groupId);
        $existing = $this->repository->find($normalized);
        if (!is_array($existing)) {
            throw ApiException::notFound('그룹을 찾을 수 없습니다.');
        }

        $normalizedPayload = $this->input()->normalizeUpdatePayload($payload);
        $this->repository->update($normalized, $normalizedPayload);

        $updated = $this->repository->find($normalized);

        return AdminGroupPresenter::group(is_array($updated) ? $updated : $existing);
    }

    public function delete(string $groupId): void
    {
        $normalized = $this->input()->normalizeGroupId($groupId);
        if ($this->repository->delete($normalized) <= 0) {
            throw ApiException::notFound('그룹을 찾을 수 없습니다.');
        }
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listMembers(string $groupId, array $query): array
    {
        return $this->memberService()->listMembers($groupId, $query);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function addMember(string $groupId, array $payload): array
    {
        return $this->memberService()->addMember($groupId, $payload);
    }

    public function removeMember(string $groupId, string $memberId): void
    {
        $this->memberService()->removeMember($groupId, $memberId);
    }

    private function input(): AdminGroupInputNormalizer
    {
        return $this->resolvedInput ??= new AdminGroupInputNormalizer();
    }

    private function memberService(): AdminGroupMemberService
    {
        return $this->resolvedMemberService ??= new AdminGroupMemberService($this->repository, $this->input());
    }
}
