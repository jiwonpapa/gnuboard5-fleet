<?php

/**
 * AdminSystemPopupService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Service;

use Api\Admin\System\Repository\AdminSystemRepository;
use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;

final class AdminSystemPopupService
{
    public function __construct(private readonly AdminSystemRepository $repository)
    {
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listPopups(array $query): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(100, max(1, (int)($query['per_page'] ?? 20)));
        $result = $this->repository->listPopups($page, $perPage);

        return [
            'items' => $result['items'],
            'pagination' => $this->buildPagination($page, $perPage, $result['total']),
        ];
    }

    public function detailPopup(int $popupId): array
    {
        $id = $this->normalizePositiveInt($popupId, 'nw_id');
        $popup = $this->repository->findPopup($id);
        if ($popup === null) {
            throw ApiException::notFound('팝업을 찾을 수 없습니다.');
        }

        return $popup;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function createPopup(array $payload): array
    {
        $normalized = $this->normalizePopupPayload($payload);
        $popupId = $this->repository->createPopup($normalized);

        return $this->detailPopup($popupId);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function updatePopup(int $popupId, array $payload): array
    {
        $id = $this->normalizePositiveInt($popupId, 'nw_id');
        if ($this->repository->findPopup($id) === null) {
            throw ApiException::notFound('팝업을 찾을 수 없습니다.');
        }

        $normalized = $this->normalizePopupPayload($payload, true);
        if ($this->repository->updatePopup($id, $normalized) <= 0) {
            throw ApiException::badRequest('수정할 필드가 없습니다.');
        }

        return $this->detailPopup($id);
    }

    public function deletePopup(int $popupId): void
    {
        $id = $this->normalizePositiveInt($popupId, 'nw_id');
        if ($this->repository->deletePopup($id) <= 0) {
            throw ApiException::notFound('팝업을 찾을 수 없습니다.');
        }
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function normalizePopupPayload(array $payload, bool $partial = false): array
    {
        $defaults = [
            'nw_division' => 'both',
            'nw_device' => 'both',
            'nw_begin_time' => G5DateTime::now(),
            'nw_end_time' => date('Y-m-d H:i:s', strtotime('+7 days') ?: time()),
            'nw_disable_hours' => 24,
            'nw_left' => 100,
            'nw_top' => 100,
            'nw_height' => 400,
            'nw_width' => 600,
            'nw_subject' => '',
            'nw_content' => '',
            'nw_content_html' => 0,
        ];
        if (array_diff(array_keys($payload), array_keys($defaults)) !== []) {
            throw ApiException::badRequest('지원하지 않는 팝업 요청 필드가 포함되어 있습니다.');
        }

        $allowed = array_keys($defaults);
        $normalized = [];
        foreach ($allowed as $field) {
            if (!$partial || array_key_exists($field, $payload)) {
                $value = array_key_exists($field, $payload) ? $payload[$field] : $defaults[$field];
                if (in_array($field, ['nw_disable_hours', 'nw_left', 'nw_top', 'nw_height', 'nw_width', 'nw_content_html'], true)) {
                    $normalized[$field] = (int)$value;
                } else {
                    $normalized[$field] = trim((string)$value);
                }
            }
        }

        if ((!$partial || array_key_exists('nw_subject', $payload)) && trim((string)($normalized['nw_subject'] ?? '')) === '') {
            throw ApiException::badRequest('nw_subject는 필수입니다.');
        }
        if ((!$partial || array_key_exists('nw_content', $payload)) && trim((string)($normalized['nw_content'] ?? '')) === '') {
            throw ApiException::badRequest('nw_content는 필수입니다.');
        }
        if (
            array_key_exists('nw_division', $normalized)
            && !in_array($normalized['nw_division'], ['both', 'comm', 'shop', 'layer', 'new'], true)
        ) {
            throw ApiException::badRequest('nw_division 값이 올바르지 않습니다.');
        }
        if (
            array_key_exists('nw_device', $normalized)
            && !in_array($normalized['nw_device'], ['both', 'pc', 'mobile'], true)
        ) {
            throw ApiException::badRequest('nw_device 값이 올바르지 않습니다.');
        }

        return $normalized;
    }

    /**
     * @return array<string, int|bool>
     */
    private function buildPagination(int $page, int $perPage, int $total): array
    {
        $lastPage = max(1, (int)ceil($total / $perPage));

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => $lastPage,
            'has_next' => $page < $lastPage,
            'has_prev' => $page > 1,
        ];
    }

    private function normalizePositiveInt(int $value, string $field): int
    {
        if ($value <= 0) {
            throw ApiException::badRequest("{$field}는 1 이상의 정수여야 합니다.");
        }

        return $value;
    }
}
