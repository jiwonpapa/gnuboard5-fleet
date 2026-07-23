<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Service;

use Api\Admin\Sms\Repository\AdminSmsRepository;
use Api\Admin\Sms\Service\Support\AdminSmsInput;
use Api\Admin\Sms\Service\Support\AdminSmsTemplatePresenter;
use Api\Support\Exception\ApiException;

final class AdminSmsTemplateGroupService
{
    public function __construct(private readonly AdminSmsRepository $repository)
    {
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,meta:array<string,mixed>}
     */
    public function listTemplateGroups(array $query = []): array
    {
        $items = $this->repository->listTemplateGroups();
        $presented = [];
        foreach ($items as $item) {
            $presented[] = AdminSmsTemplatePresenter::group($item);
        }

        return [
            'items' => $presented,
            'meta' => ['total' => count($presented)],
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function detailTemplateGroup(int $groupId): array
    {
        AdminSmsInput::assertNonNegativeInt($groupId, 'fg_no');
        $group = $this->repository->findTemplateGroup($groupId);
        if ($group === null) {
            throw ApiException::notFound('이모티콘 그룹을 찾을 수 없습니다.');
        }

        return AdminSmsTemplatePresenter::group($group);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createTemplateGroup(array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, ['fg_name', 'fg_member']);
        $name = trim((string)($payload['fg_name'] ?? ''));
        if ($name === '') {
            throw ApiException::badRequest('fg_name은 필수입니다.');
        }
        if ($this->repository->templateGroupNameExists($name)) {
            throw ApiException::conflict('같은 이름의 이모티콘 그룹이 이미 존재합니다.');
        }

        return AdminSmsTemplatePresenter::group(
            $this->repository->createTemplateGroup($name, AdminSmsInput::boolToInt($payload['fg_member'] ?? 0))
        );
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateTemplateGroup(int $groupId, array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, ['fg_name', 'fg_member']);
        AdminSmsInput::assertPositiveInt($groupId, 'fg_no');
        if ($this->repository->findTemplateGroup($groupId) === null) {
            throw ApiException::notFound('이모티콘 그룹을 찾을 수 없습니다.');
        }

        $normalized = [];
        if (array_key_exists('fg_name', $payload)) {
            $name = trim((string)$payload['fg_name']);
            if ($name === '') {
                throw ApiException::badRequest('fg_name은 빈값일 수 없습니다.');
            }
            if ($this->repository->templateGroupNameExists($name, $groupId)) {
                throw ApiException::conflict('같은 이름의 이모티콘 그룹이 이미 존재합니다.');
            }
            $normalized['fg_name'] = $name;
        }

        if (array_key_exists('fg_member', $payload)) {
            $normalized['fg_member'] = AdminSmsInput::boolToInt($payload['fg_member']);
        }

        if ($normalized === []) {
            throw ApiException::badRequest('수정할 그룹 필드가 없습니다.');
        }

        return AdminSmsTemplatePresenter::group($this->repository->updateTemplateGroup($groupId, $normalized));
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function moveTemplateGroup(int $groupId, array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, ['target_fg_no']);
        AdminSmsInput::assertNonNegativeInt($groupId, 'fg_no');
        $targetGroupId = (int)($payload['target_fg_no'] ?? -1);
        AdminSmsInput::assertNonNegativeInt($targetGroupId, 'target_fg_no');
        if ($groupId === $targetGroupId) {
            throw ApiException::badRequest('같은 그룹으로는 이동할 수 없습니다.');
        }
        if ($groupId > 0 && $this->repository->findTemplateGroup($groupId) === null) {
            throw ApiException::notFound('이동할 원본 그룹을 찾을 수 없습니다.');
        }
        if ($this->repository->findTemplateGroup($targetGroupId) === null) {
            throw ApiException::notFound('이동할 대상 그룹을 찾을 수 없습니다.');
        }

        return [
            'from_fg_no' => $groupId,
            'target_fg_no' => $targetGroupId,
            'affected' => $this->repository->moveTemplateGroup($groupId, $targetGroupId),
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function clearTemplateGroup(int $groupId): array
    {
        AdminSmsInput::assertNonNegativeInt($groupId, 'fg_no');
        if ($groupId > 0 && $this->repository->findTemplateGroup($groupId) === null) {
            throw ApiException::notFound('이모티콘 그룹을 찾을 수 없습니다.');
        }

        return [
            'fg_no' => $groupId,
            'deleted' => $this->repository->clearTemplateGroup($groupId),
        ];
    }

    public function deleteTemplateGroup(int $groupId): void
    {
        AdminSmsInput::assertPositiveInt($groupId, 'fg_no');
        if ($this->repository->findTemplateGroup($groupId) === null) {
            throw ApiException::notFound('이모티콘 그룹을 찾을 수 없습니다.');
        }

        $this->repository->deleteTemplateGroup($groupId);
    }
}
