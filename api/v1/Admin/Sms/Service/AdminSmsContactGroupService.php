<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Service;

use Api\Admin\Sms\Repository\AdminSmsRepository;
use Api\Admin\Sms\Service\Support\AdminSmsContactPresenter;
use Api\Admin\Sms\Service\Support\AdminSmsInput;
use Api\Support\Exception\ApiException;

final class AdminSmsContactGroupService
{
    public function __construct(private readonly AdminSmsRepository $repository)
    {
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,meta:array<string,mixed>}
     */
    public function listContactGroups(array $query = []): array
    {
        $items = $this->repository->listContactGroups();
        $presented = [];
        foreach ($items as $item) {
            $presented[] = AdminSmsContactPresenter::group($item);
        }

        return [
            'items' => $presented,
            'meta' => ['total' => count($presented)],
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function detailContactGroup(int $groupId): array
    {
        AdminSmsInput::assertPositiveInt($groupId, 'bg_no');
        $group = $this->repository->findContactGroup($groupId);
        if ($group === null) {
            throw ApiException::notFound('휴대폰번호 그룹을 찾을 수 없습니다.');
        }

        return AdminSmsContactPresenter::group($group);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createContactGroup(array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, ['bg_name']);
        $name = trim((string)($payload['bg_name'] ?? ''));
        if ($name === '') {
            throw ApiException::badRequest('bg_name은 필수입니다.');
        }
        if ($this->repository->contactGroupNameExists($name)) {
            throw ApiException::conflict('같은 이름의 휴대폰번호 그룹이 이미 존재합니다.');
        }

        return AdminSmsContactPresenter::group($this->repository->createContactGroup($name));
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateContactGroup(int $groupId, array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, ['bg_name']);
        AdminSmsInput::assertPositiveInt($groupId, 'bg_no');
        if ($groupId === 1) {
            throw ApiException::badRequest('기본 휴대폰번호 그룹은 수정할 수 없습니다.');
        }
        if ($this->repository->findContactGroup($groupId) === null) {
            throw ApiException::notFound('휴대폰번호 그룹을 찾을 수 없습니다.');
        }

        $name = trim((string)($payload['bg_name'] ?? ''));
        if ($name === '') {
            throw ApiException::badRequest('bg_name은 필수입니다.');
        }
        if ($this->repository->contactGroupNameExists($name, $groupId)) {
            throw ApiException::conflict('같은 이름의 휴대폰번호 그룹이 이미 존재합니다.');
        }

        return AdminSmsContactPresenter::group($this->repository->updateContactGroup($groupId, $name));
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function moveContactGroup(int $groupId, array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, ['target_bg_no']);
        AdminSmsInput::assertPositiveInt($groupId, 'bg_no');
        if ($groupId === 1) {
            throw ApiException::badRequest('기본 휴대폰번호 그룹은 이동할 수 없습니다.');
        }

        $targetGroupId = (int)($payload['target_bg_no'] ?? 0);
        AdminSmsInput::assertPositiveInt($targetGroupId, 'target_bg_no');
        if ($groupId === $targetGroupId) {
            throw ApiException::badRequest('같은 그룹으로는 이동할 수 없습니다.');
        }
        if ($this->repository->findContactGroup($groupId) === null || $this->repository->findContactGroup($targetGroupId) === null) {
            throw ApiException::notFound('이동할 그룹을 찾을 수 없습니다.');
        }

        return [
            'from_bg_no' => $groupId,
            'target_bg_no' => $targetGroupId,
            'affected' => $this->repository->moveContactGroup($groupId, $targetGroupId),
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function clearContactGroup(int $groupId): array
    {
        AdminSmsInput::assertPositiveInt($groupId, 'bg_no');
        if ($groupId === 1) {
            throw ApiException::badRequest('기본 휴대폰번호 그룹은 비울 수 없습니다.');
        }
        if ($this->repository->findContactGroup($groupId) === null) {
            throw ApiException::notFound('휴대폰번호 그룹을 찾을 수 없습니다.');
        }

        return [
            'bg_no' => $groupId,
            'deleted' => $this->repository->clearContactGroup($groupId),
        ];
    }

    public function deleteContactGroup(int $groupId): void
    {
        AdminSmsInput::assertPositiveInt($groupId, 'bg_no');
        if ($groupId === 1) {
            throw ApiException::badRequest('기본 휴대폰번호 그룹은 삭제할 수 없습니다.');
        }
        if ($this->repository->findContactGroup($groupId) === null) {
            throw ApiException::notFound('휴대폰번호 그룹을 찾을 수 없습니다.');
        }

        $this->repository->deleteContactGroup($groupId);
    }
}
