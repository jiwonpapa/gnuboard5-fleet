<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Service;

use Api\Admin\Sms\Repository\AdminSmsRepository;
use Api\Admin\Sms\Service\Support\AdminSmsContactPresenter;
use Api\Admin\Sms\Service\Support\AdminSmsInput;
use Api\Support\Exception\ApiException;
use Psr\Http\Message\UploadedFileInterface;

final class AdminSmsContactEntryService
{
    public function __construct(private readonly AdminSmsRepository $repository)
    {
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>,meta:array<string,mixed>}
     */
    public function listContacts(array $query): array
    {
        [$page, $perPage] = AdminSmsInput::pagination($query);
        $groupId = AdminSmsInput::nullablePositiveInt($query['bg_no'] ?? null, 'bg_no');
        $searchField = AdminSmsInput::normalizeEnum(
            (string)($query['search_field'] ?? $query['st'] ?? 'all'),
            ['all', 'name', 'hp'],
            'search_field'
        );
        $search = trim((string)($query['search'] ?? $query['sv'] ?? ''));
        $withPhoneOnly = AdminSmsInput::toBool($query['with_phone_only'] ?? $query['no_hp'] ?? false);

        $result = $this->repository->listContacts($page, $perPage, $groupId, $searchField, $search, $withPhoneOnly);
        $items = [];
        foreach ($result['items'] as $item) {
            $items[] = AdminSmsContactPresenter::contact($item);
        }

        return [
            'items' => $items,
            'pagination' => AdminSmsInput::buildPagination($page, $perPage, $result['total']),
            'meta' => AdminSmsContactPresenter::summary($result['summary']),
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function detailContact(int $contactId): array
    {
        AdminSmsInput::assertPositiveInt($contactId, 'bk_no');
        $contact = $this->repository->findContact($contactId);
        if ($contact === null) {
            throw ApiException::notFound('휴대폰번호 항목을 찾을 수 없습니다.');
        }

        return AdminSmsContactPresenter::contact($contact);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function createContact(array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, ['bg_no', 'mb_id', 'bk_name', 'bk_hp', 'bk_receipt', 'bk_memo']);
        $groupId = AdminSmsInput::nullablePositiveInt($payload['bg_no'] ?? 1, 'bg_no') ?? 1;
        if ($this->repository->findContactGroup($groupId) === null) {
            throw ApiException::badRequest('유효한 bg_no가 필요합니다.');
        }

        $name = trim((string)($payload['bk_name'] ?? ''));
        $phone = AdminSmsInput::normalizeMobilePhone((string)($payload['bk_hp'] ?? ''));
        if ($name === '' || $phone === '') {
            throw ApiException::badRequest('bk_name, bk_hp는 필수입니다.');
        }
        if ($this->repository->findContactByPhone($phone) !== null) {
            throw ApiException::conflict('같은 휴대폰번호가 이미 존재합니다.');
        }

        return AdminSmsContactPresenter::contact($this->repository->createContact([
            'bg_no' => $groupId,
            'mb_id' => trim((string)($payload['mb_id'] ?? '')),
            'bk_name' => $name,
            'bk_hp' => $phone,
            'bk_receipt' => AdminSmsInput::boolToInt($payload['bk_receipt'] ?? 1),
            'bk_memo' => trim((string)($payload['bk_memo'] ?? '')),
        ]));
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function updateContact(int $contactId, array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, ['bg_no', 'bk_name', 'bk_hp', 'bk_receipt', 'bk_memo']);
        AdminSmsInput::assertPositiveInt($contactId, 'bk_no');
        if ($this->repository->findContact($contactId) === null) {
            throw ApiException::notFound('휴대폰번호 항목을 찾을 수 없습니다.');
        }

        $normalized = [];
        if (array_key_exists('bg_no', $payload)) {
            $groupId = AdminSmsInput::nullablePositiveInt($payload['bg_no'], 'bg_no');
            if ($groupId === null || $this->repository->findContactGroup($groupId) === null) {
                throw ApiException::badRequest('유효한 bg_no가 필요합니다.');
            }
            $normalized['bg_no'] = $groupId;
        }
        if (array_key_exists('bk_name', $payload)) {
            $name = trim((string)$payload['bk_name']);
            if ($name === '') {
                throw ApiException::badRequest('bk_name은 빈값일 수 없습니다.');
            }
            $normalized['bk_name'] = $name;
        }
        if (array_key_exists('bk_hp', $payload)) {
            $phone = AdminSmsInput::normalizeMobilePhone((string)$payload['bk_hp']);
            if ($this->repository->findContactByPhone($phone, $contactId) !== null) {
                throw ApiException::conflict('같은 휴대폰번호가 이미 존재합니다.');
            }
            $normalized['bk_hp'] = $phone;
        }
        if (array_key_exists('bk_receipt', $payload)) {
            $normalized['bk_receipt'] = AdminSmsInput::boolToInt($payload['bk_receipt']);
        }
        if (array_key_exists('bk_memo', $payload)) {
            $normalized['bk_memo'] = trim((string)$payload['bk_memo']);
        }
        if ($normalized === []) {
            throw ApiException::badRequest('수정할 연락처 필드가 없습니다.');
        }

        return AdminSmsContactPresenter::contact($this->repository->updateContact($contactId, $normalized));
    }

    public function deleteContact(int $contactId): void
    {
        AdminSmsInput::assertPositiveInt($contactId, 'bk_no');
        if ($this->repository->deleteContact($contactId) <= 0) {
            throw ApiException::notFound('휴대폰번호 항목을 찾을 수 없습니다.');
        }
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function batchContacts(array $payload): array
    {
        AdminSmsInput::assertAllowedKeys($payload, ['action', 'contact_ids', 'bk_no', 'target_bg_no']);
        $action = AdminSmsInput::normalizeEnum((string)($payload['action'] ?? ''), ['delete', 'allow', 'reject', 'move', 'copy'], 'action');
        $contactIds = AdminSmsInput::normalizeIntList($payload['contact_ids'] ?? $payload['bk_no'] ?? [], 'contact_ids');
        if ($contactIds === []) {
            throw ApiException::badRequest('contact_ids 배열이 필요합니다.');
        }

        $targetGroupId = null;
        if (in_array($action, ['move', 'copy'], true)) {
            $targetGroupId = AdminSmsInput::nullablePositiveInt($payload['target_bg_no'] ?? null, 'target_bg_no');
            if ($targetGroupId === null || $this->repository->findContactGroup($targetGroupId) === null) {
                throw ApiException::badRequest('이동/복사할 target_bg_no가 필요합니다.');
            }
        }

        return AdminSmsContactPresenter::batchResult(
            $this->repository->batchUpdateContacts($action, $contactIds, $targetGroupId)
        );
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function importContacts(array $payload, ?UploadedFileInterface $uploadedFile = null): array
    {
        AdminSmsInput::assertAllowedKeys($payload, ['bg_no', 'upload_bg_no', 'dry_run', 'confirm', 'contacts']);
        $groupId = AdminSmsInput::nullablePositiveInt($payload['bg_no'] ?? $payload['upload_bg_no'] ?? null, 'bg_no');
        if ($groupId === null || $this->repository->findContactGroup($groupId) === null) {
            throw ApiException::badRequest('유효한 bg_no가 필요합니다.');
        }

        $dryRun = AdminSmsInput::toBool($payload['dry_run'] ?? $payload['confirm'] ?? false);

        if ($uploadedFile instanceof UploadedFileInterface && $uploadedFile->getError() === \UPLOAD_ERR_OK) {
            return AdminSmsContactPresenter::importResult(
                $this->repository->importContactsFromUpload($uploadedFile, $groupId, $dryRun)
            );
        }

        $contacts = $payload['contacts'] ?? null;
        if (!is_array($contacts)) {
            throw ApiException::badRequest('업로드 파일 또는 contacts 배열이 필요합니다.');
        }

        $validatedContacts = [];
        foreach ($contacts as $contact) {
            if (!is_array($contact)) {
                throw ApiException::badRequest('contacts 항목은 객체여야 합니다.');
            }
            AdminSmsInput::assertAllowedKeys(
                $contact,
                ['name', 'phone', 'memo', 'receipt', 'bk_name', 'bk_hp', 'bk_memo', 'bk_receipt'],
                'contacts 항목'
            );
            if (array_key_exists('receipt', $contact)) {
                $contact['receipt'] = AdminSmsInput::boolToInt($contact['receipt']);
            }
            if (array_key_exists('bk_receipt', $contact)) {
                $contact['bk_receipt'] = AdminSmsInput::boolToInt($contact['bk_receipt']);
            }
            $validatedContacts[] = $contact;
        }

        return AdminSmsContactPresenter::importResult(
            $this->repository->importContacts($validatedContacts, $groupId, $dryRun)
        );
    }

    /**
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,meta:array<string,mixed>}
     */
    public function exportContacts(array $query): array
    {
        $rawGroup = $query['bg_no'] ?? $query['group_id'] ?? null;
        $groupId = null;
        if ($rawGroup !== null && trim((string)$rawGroup) !== '' && trim((string)$rawGroup) !== 'all') {
            $groupId = AdminSmsInput::nullablePositiveInt($rawGroup, 'bg_no');
            if ($groupId === null || $this->repository->findContactGroup($groupId) === null) {
                throw ApiException::badRequest('유효한 bg_no가 필요합니다.');
            }
        }

        $includeNoPhone = AdminSmsInput::toBool($query['include_no_phone'] ?? $query['no_hp'] ?? false);
        $withHyphen = AdminSmsInput::toBool($query['with_hyphen'] ?? $query['hyphen'] ?? true);
        $items = $this->repository->exportContacts($groupId, $includeNoPhone, $withHyphen);
        $presented = [];
        foreach ($items as $item) {
            $presented[] = AdminSmsContactPresenter::exportItem($item);
        }

        return [
            'items' => $presented,
            'meta' => [
                'total' => count($presented),
                'bg_no' => $groupId,
                'include_no_phone' => $includeNoPhone,
                'with_hyphen' => $withHyphen,
            ],
        ];
    }
}
