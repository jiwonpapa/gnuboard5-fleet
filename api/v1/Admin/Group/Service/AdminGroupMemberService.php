<?php

declare(strict_types=1);

namespace Api\Admin\Group\Service;

use Api\Admin\Group\Repository\AdminGroupRepository;
use Api\Admin\Group\Service\Support\AdminGroupInputNormalizer;
use Api\Admin\Group\Service\Support\AdminGroupPresenter;
use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;

final readonly class AdminGroupMemberService
{
    public function __construct(
        private AdminGroupRepository $repository,
        private AdminGroupInputNormalizer $input
    ) {
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listMembers(string $groupId, array $query): array
    {
        $normalized = $this->input->normalizeGroupId($groupId);
        if ($this->repository->find($normalized) === null) {
            throw ApiException::notFound('그룹을 찾을 수 없습니다.');
        }

        $paging = $this->input->normalizeMemberListQuery($query);
        $result = $this->repository->listMembers(
            $normalized,
            $paging['page'],
            $paging['per_page'],
            $paging['search']
        );

        return [
            'items' => array_map(
                static fn (array $member): array => AdminGroupPresenter::member($member),
                $result['items']
            ),
            'pagination' => [
                'total' => $result['total'],
                'page' => $paging['page'],
                'per_page' => $paging['per_page'],
                'last_page' => max(1, (int)ceil($result['total'] / $paging['per_page'])),
                'has_next' => ($paging['page'] * $paging['per_page']) < (int)$result['total'],
                'has_prev' => $paging['page'] > 1,
            ],
        ];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function addMember(string $groupId, array $payload): array
    {
        $normalizedGroupId = $this->input->normalizeGroupId($groupId);
        if ($this->repository->find($normalizedGroupId) === null) {
            throw ApiException::notFound('그룹을 찾을 수 없습니다.');
        }

        $memberId = $this->input->normalizeMemberPayload($payload);
        if (!$this->repository->existsMember($memberId)) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }
        if ($this->repository->existsGroupMember($normalizedGroupId, $memberId)) {
            throw ApiException::conflict('이미 그룹에 등록된 회원입니다.');
        }

        $datetime = G5DateTime::now();
        $this->repository->addMember($normalizedGroupId, $memberId, $datetime);

        return [
            'gr_id' => $normalizedGroupId,
            'mb_id' => $memberId,
            'gm_datetime' => $datetime,
        ];
    }

    public function removeMember(string $groupId, string $memberId): void
    {
        $normalizedGroupId = $this->input->normalizeGroupId($groupId);
        $normalizedMemberId = $this->input->normalizeMemberId($memberId);

        if ($this->repository->removeMember($normalizedGroupId, $normalizedMemberId) <= 0) {
            throw ApiException::notFound('그룹 회원을 찾을 수 없습니다.');
        }
    }
}
