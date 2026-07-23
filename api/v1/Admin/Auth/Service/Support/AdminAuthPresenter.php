<?php

declare(strict_types=1);

namespace Api\Admin\Auth\Service\Support;

final class AdminAuthPresenter
{
    /**
     * @param array{total:int,items:array<int,array<string,mixed>>} $result
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function presentList(array $result, int $page, int $perPage): array
    {
        $grouped = [];
        foreach ($result['items'] as $row) {
            $mbId = (string)($row['mb_id'] ?? '');
            if ($mbId === '') {
                continue;
            }

            $grouped[$mbId][] = $row;
        }

        $items = [];
        foreach ($grouped as $rows) {
            $items[] = $this->presentMember($rows);
        }

        $total = (int)($result['total'] ?? 0);
        $lastPage = (int)ceil($total / max(1, $perPage));

        return [
            'items' => $items,
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
     * @param list<array<string,mixed>> $rows
     * @return array{mb_id:string,mb_name:string,mb_nick:string,auths:list<array{au_menu:string,au_auth:string}>}
     */
    private function presentMember(array $rows): array
    {
        $first = $rows[0] ?? [];
        $auths = [];
        foreach ($rows as $row) {
            $auths[] = $this->presentAssignment($row);
        }

        return [
            'mb_id' => (string)($first['mb_id'] ?? ''),
            'mb_name' => (string)($first['mb_name'] ?? ''),
            'mb_nick' => (string)($first['mb_nick'] ?? ''),
            'auths' => $auths,
        ];
    }

    /**
     * @param array<string,mixed> $row
     * @return array{au_menu:string,au_auth:string}
     */
    private function presentAssignment(array $row): array
    {
        return [
            'au_menu' => (string)($row['au_menu'] ?? ''),
            'au_auth' => (string)($row['au_auth'] ?? ''),
        ];
    }
}
