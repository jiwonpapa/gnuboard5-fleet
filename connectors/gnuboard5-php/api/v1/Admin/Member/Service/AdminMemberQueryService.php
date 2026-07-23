<?php

declare(strict_types=1);

namespace Api\Admin\Member\Service;

use Api\Admin\Member\Repository\AdminMemberRepository;
use Api\Admin\Member\Service\Support\AdminMemberPresenter;
use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;

final class AdminMemberQueryService
{
    public function __construct(private readonly AdminMemberRepository $repository)
    {
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function list(array $query): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(100, max(1, (int)($query['per_page'] ?? 20)));
        $sortBy = trim((string)($query['sort_by'] ?? 'mb_id'));
        $sortDirection = strtoupper(trim((string)($query['sort_direction'] ?? 'ASC')));
        if (!in_array($sortDirection, ['ASC', 'DESC'], true)) {
            throw ApiException::badRequest('sort_direction은 ASC 또는 DESC여야 합니다.');
        }
        $search = isset($query['search']) ? (string)$query['search'] : null;
        $searchField = $this->normalizeSearchField($query['search_field'] ?? null);

        $result = $this->repository->list($page, $perPage, $search, $searchField, $sortBy, $sortDirection);

        return [
            'items' => array_map(
                static fn (array $member): array => AdminMemberPresenter::member($member),
                $result['items']
            ),
            'pagination' => $this->buildPagination($page, $perPage, (int)$result['total']),
        ];
    }

    public function detail(string $memberId): array
    {
        $member = $this->repository->find($this->normalizeMemberId($memberId));
        if ($member === null) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }

        return AdminMemberPresenter::member($member);
    }

    /**
     * @param array<string,mixed> $query
     * @return array<int,array<string,mixed>>
     */
    public function exportExcel(array $query): array
    {
        $search = isset($query['search']) ? trim((string)$query['search']) : null;
        $searchField = $this->normalizeSearchField($query['search_field'] ?? null);

        return array_map(
            static fn (array $member): array => AdminMemberPresenter::member($member),
            $this->repository->exportExcel($search, $searchField)
        );
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

    private function normalizeMemberId(string $memberId): string
    {
        $value = trim($memberId);
        if ($value === '' || preg_match(ValidationPatterns::MEMBER_ID, $value) !== 1) {
            throw ApiException::badRequest('mb_id 형식이 올바르지 않습니다.');
        }

        return $value;
    }

    private function normalizeSearchField(mixed $searchField): ?string
    {
        if ($searchField === null) {
            return null;
        }

        $value = trim((string)$searchField);
        if ($value === '') {
            return null;
        }

        if (!in_array($value, ['all', 'mb_id', 'mb_name', 'mb_nick', 'mb_email'], true)) {
            throw ApiException::badRequest('search_field 값이 올바르지 않습니다.');
        }

        return $value;
    }
}
