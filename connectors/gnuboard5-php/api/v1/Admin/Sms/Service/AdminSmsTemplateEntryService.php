<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Service;

use Api\Admin\Sms\Repository\AdminSmsRepository;
use Api\Admin\Sms\Service\Support\AdminSmsInput;
use Api\Admin\Sms\Service\Support\AdminSmsTemplatePresenter;
use Api\Support\Exception\ApiException;

final class AdminSmsTemplateEntryService
{
    public function __construct(private readonly AdminSmsRepository $repository)
    {
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listTemplates(array $query): array
    {
        [$page, $perPage] = AdminSmsInput::pagination($query);
        $groupId = AdminSmsInput::nullableNonNegativeInt($query['fg_no'] ?? null, 'fg_no');
        $searchField = AdminSmsInput::normalizeEnum(
            (string)($query['search_field'] ?? $query['st'] ?? 'all'),
            ['all', 'name', 'content'],
            'search_field'
        );
        $search = trim((string)($query['search'] ?? $query['sv'] ?? ''));

        $result = $this->repository->listTemplates($page, $perPage, $groupId, $searchField, $search);
        $items = [];
        foreach ($result['items'] as $item) {
            $items[] = AdminSmsTemplatePresenter::template($item);
        }

        return [
            'items' => $items,
            'pagination' => AdminSmsInput::buildPagination($page, $perPage, $result['total']),
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function detailTemplate(int $templateId): array
    {
        AdminSmsInput::assertPositiveInt($templateId, 'fo_no');
        $template = $this->repository->findTemplate($templateId);
        if ($template === null) {
            throw ApiException::notFound('이모티콘 템플릿을 찾을 수 없습니다.');
        }

        return AdminSmsTemplatePresenter::template($template);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createTemplate(array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, ['fg_no', 'fo_name', 'fo_content']);
        $groupId = AdminSmsInput::nullableNonNegativeInt($payload['fg_no'] ?? 0, 'fg_no') ?? 0;
        if ($groupId > 0 && $this->repository->findTemplateGroup($groupId) === null) {
            throw ApiException::badRequest('유효한 fg_no가 필요합니다.');
        }

        $name = trim((string)($payload['fo_name'] ?? ''));
        $content = trim((string)($payload['fo_content'] ?? ''));
        if ($name === '' || $content === '') {
            throw ApiException::badRequest('fo_name, fo_content는 필수입니다.');
        }
        if ($this->repository->templateContentExists($content)) {
            throw ApiException::conflict('같은 내용의 이모티콘 템플릿이 이미 존재합니다.');
        }

        return AdminSmsTemplatePresenter::template($this->repository->createTemplate([
            'fg_no' => $groupId,
            'fo_name' => $name,
            'fo_content' => $content,
        ]));
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateTemplate(int $templateId, array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, ['fg_no', 'fo_name', 'fo_content']);
        AdminSmsInput::assertPositiveInt($templateId, 'fo_no');
        if ($this->repository->findTemplate($templateId) === null) {
            throw ApiException::notFound('이모티콘 템플릿을 찾을 수 없습니다.');
        }

        $normalized = [];
        if (array_key_exists('fg_no', $payload)) {
            $groupId = AdminSmsInput::nullableNonNegativeInt($payload['fg_no'], 'fg_no') ?? 0;
            if ($groupId > 0 && $this->repository->findTemplateGroup($groupId) === null) {
                throw ApiException::badRequest('유효한 fg_no가 필요합니다.');
            }
            $normalized['fg_no'] = $groupId;
        }
        if (array_key_exists('fo_name', $payload)) {
            $name = trim((string)$payload['fo_name']);
            if ($name === '') {
                throw ApiException::badRequest('fo_name은 빈값일 수 없습니다.');
            }
            $normalized['fo_name'] = $name;
        }
        if (array_key_exists('fo_content', $payload)) {
            $content = trim((string)$payload['fo_content']);
            if ($content === '') {
                throw ApiException::badRequest('fo_content는 빈값일 수 없습니다.');
            }
            $normalized['fo_content'] = $content;
        }
        if ($normalized === []) {
            throw ApiException::badRequest('수정할 템플릿 필드가 없습니다.');
        }

        return AdminSmsTemplatePresenter::template($this->repository->updateTemplate($templateId, $normalized));
    }

    public function deleteTemplate(int $templateId): void
    {
        AdminSmsInput::assertPositiveInt($templateId, 'fo_no');
        if ($this->repository->deleteTemplate($templateId) <= 0) {
            throw ApiException::notFound('이모티콘 템플릿을 찾을 수 없습니다.');
        }
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function batchTemplates(array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, ['action', 'template_ids', 'fo_no', 'target_fg_no']);
        $action = AdminSmsInput::normalizeEnum((string)($payload['action'] ?? ''), ['move', 'delete'], 'action');
        $templateIds = AdminSmsInput::normalizeIntList($payload['template_ids'] ?? $payload['fo_no'] ?? [], 'template_ids');
        if ($templateIds === []) {
            throw ApiException::badRequest('template_ids 배열이 필요합니다.');
        }

        $targetGroupId = null;
        if ($action === 'move') {
            $targetGroupId = AdminSmsInput::nullableNonNegativeInt($payload['target_fg_no'] ?? null, 'target_fg_no');
            if ($targetGroupId === null || $this->repository->findTemplateGroup($targetGroupId) === null) {
                throw ApiException::badRequest('이동할 target_fg_no가 필요합니다.');
            }
        }

        return AdminSmsTemplatePresenter::batchResult(
            $this->repository->batchUpdateTemplates($action, $templateIds, $targetGroupId)
        );
    }
}
