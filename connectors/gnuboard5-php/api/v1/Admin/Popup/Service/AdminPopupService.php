<?php

/**
 * AdminPopupService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Popup\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Popup\Service;

use Api\Admin\Popup\Repository\AdminPopupRepository;
use Api\Admin\Popup\Service\Support\AdminPopupAccessPolicy;
use Api\Admin\Popup\Service\Support\AdminPopupInputNormalizer;
use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;

final class AdminPopupService
{
    private readonly AdminPopupAccessPolicy $accessPolicy;
    private readonly AdminPopupInputNormalizer $input;

    public function __construct(private readonly AdminPopupRepository $repository)
    {
        $this->accessPolicy = new AdminPopupAccessPolicy();
        $this->input = new AdminPopupInputNormalizer();
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

        return [
            'items' => $result['items'],
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
    public function detailAdmin(array $member, int $popupId): array
    {
        $this->accessPolicy->assertSuperAdmin($member);
        $id = $this->input->requirePopupId($popupId);

        $popup = $this->repository->find($id);
        if ($popup === null) {
            throw ApiException::notFound('팝업을 찾을 수 없습니다.');
        }

        return $popup;
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $payload
     */
    public function createAdmin(array $member, array $payload): array
    {
        $this->accessPolicy->assertSuperAdmin($member);
        $normalized = $this->input->normalizePayload($payload);
        $id = $this->repository->create($normalized);

        return $this->detailAdmin($member, $id);
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $payload
     */
    public function updateAdmin(int $popupId, array $member, array $payload): array
    {
        $this->accessPolicy->assertSuperAdmin($member);
        $id = $this->input->requirePopupId($popupId);
        if ($this->repository->find($id) === null) {
            throw ApiException::notFound('팝업을 찾을 수 없습니다.');
        }

        $normalized = $this->input->normalizePayload($payload, true);
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
    public function deleteAdmin(int $popupId, array $member): void
    {
        $this->accessPolicy->assertSuperAdmin($member);
        $id = $this->input->requirePopupId($popupId);
        if ($this->repository->delete($id) <= 0) {
            throw ApiException::notFound('팝업을 찾을 수 없습니다.');
        }
    }

    /**
     * @param array<string,mixed> $query
     * @return array<string,mixed>
     */
    public function active(array $query): array
    {
        $activeInput = $this->input->normalizeActiveQuery($query);
        $device = $activeInput['device'];
        $division = $activeInput['division'];
        $now = G5DateTime::now();

        $items = $this->repository->listActive($now, $device, $division);

        return [
            'now' => $now,
            'device' => $device,
            'division' => $division,
            'items' => $items,
        ];
    }
}
