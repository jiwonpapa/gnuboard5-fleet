<?php

/**
 * AdminSystemAuthService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Service;

use Api\Admin\System\Repository\AdminSystemRepository;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;

final class AdminSystemAuthService
{
    private const SAVE_FIELDS = ['mb_id', 'au_menu', 'au_auth'];

    public function __construct(private readonly AdminSystemRepository $repository)
    {
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listAuth(array $query): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(100, max(1, (int)($query['per_page'] ?? 20)));
        $memberId = isset($query['mb_id']) ? $this->normalizeMemberId((string)$query['mb_id'], true) : null;

        $result = $this->repository->listAuth($page, $perPage, $memberId);
        $items = [];
        foreach ($result['items'] as $item) {
            $items[] = [
                'mb_id' => (string)($item['mb_id'] ?? ''),
                'au_menu' => (string)($item['au_menu'] ?? ''),
                'au_auth' => (string)($item['au_auth'] ?? ''),
                'mb_name' => isset($item['mb_name']) ? (string)$item['mb_name'] : null,
                'mb_nick' => isset($item['mb_nick']) ? (string)$item['mb_nick'] : null,
            ];
        }

        return [
            'items' => $items,
            'pagination' => $this->buildPagination($page, $perPage, $result['total']),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function saveAuth(array $payload): array
    {
        if (array_diff(array_keys($payload), self::SAVE_FIELDS) !== []) {
            throw ApiException::badRequest('지원하지 않는 관리 권한 요청 필드가 포함되어 있습니다.');
        }

        $memberId = (string)$this->normalizeMemberId((string)($payload['mb_id'] ?? ''), false);
        $menu = $this->normalizeMenuCode((string)($payload['au_menu'] ?? ''));
        $auth = $this->normalizeAuth((string)($payload['au_auth'] ?? ''));

        $this->repository->upsertAuth($memberId, $menu, $auth);

        return [
            'mb_id' => $memberId,
            'au_menu' => $menu,
            'au_auth' => $auth,
        ];
    }

    public function deleteAuth(string $memberId, string $menu): void
    {
        $normalizedMemberId = (string)$this->normalizeMemberId($memberId, false);
        $normalizedMenu = $this->normalizeMenuCode($menu);
        if ($this->repository->deleteAuth($normalizedMemberId, $normalizedMenu) <= 0) {
            throw ApiException::notFound('관리 권한 항목을 찾을 수 없습니다.');
        }
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

    private function normalizeMemberId(string $memberId, bool $allowEmpty): ?string
    {
        $value = trim($memberId);
        if ($value === '') {
            return $allowEmpty ? null : throw ApiException::badRequest('mb_id는 필수입니다.');
        }
        if (preg_match(ValidationPatterns::MEMBER_ID, $value) !== 1) {
            throw ApiException::badRequest('mb_id 형식이 올바르지 않습니다.');
        }

        return $value;
    }

    private function normalizeMenuCode(string $menuCode): string
    {
        $value = trim($menuCode);
        if ($value === '' || preg_match('/^[a-zA-Z0-9_]{1,50}$/', $value) !== 1) {
            throw ApiException::badRequest('au_menu 형식이 올바르지 않습니다.');
        }

        return $value;
    }

    private function normalizeAuth(string $auth): string
    {
        $value = strtolower(trim($auth));
        if ($value === '') {
            throw ApiException::badRequest('au_auth는 필수입니다.');
        }

        if (preg_match('/^[rwd]+$/', $value) !== 1) {
            throw ApiException::badRequest('au_auth는 r/w/d 조합만 가능합니다.');
        }

        $normalized = '';
        foreach (['d', 'r', 'w'] as $token) {
            if (str_contains($value, $token)) {
                $normalized .= $token;
            }
        }

        return $normalized;
    }
}
