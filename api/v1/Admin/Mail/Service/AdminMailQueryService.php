<?php

declare(strict_types=1);

namespace Api\Admin\Mail\Service;

use Api\Admin\Mail\Repository\AdminMailRepository;
use Api\Admin\Mail\Service\Support\AdminMailPresenter;
use Api\Core\Enum\MemberLevel;
use Api\Support\Exception\ApiException;

final class AdminMailQueryService
{
    public function __construct(private readonly AdminMailRepository $repository)
    {
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listAdmin(array $member, array $query): array
    {
        $this->assertSuperAdmin($member);

        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(100, max(1, (int)($query['per_page'] ?? 20)));
        $result = $this->repository->listTemplates($page, $perPage);
        $total = (int)($result['total'] ?? 0);
        $lastPage = (int)ceil($total / max(1, $perPage));

        return [
            'items' => array_map(
                static fn (array $mail): array => AdminMailPresenter::template($mail),
                $result['items']
            ),
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
    public function detailAdmin(array $member, int $mailId): array
    {
        $this->assertSuperAdmin($member);
        $id = $this->normalizePositiveInt($mailId, 'ma_id');
        $mail = $this->repository->findTemplate($id);
        if ($mail === null) {
            throw ApiException::notFound('메일 템플릿을 찾을 수 없습니다.');
        }

        return $mail;
    }

    /**
     * @param array<string,mixed> $member
     */
    public function deleteAdmin(array $member, int $mailId): void
    {
        $this->assertSuperAdmin($member);
        $id = $this->normalizePositiveInt($mailId, 'ma_id');
        if ($this->repository->deleteTemplate($id) <= 0) {
            throw ApiException::notFound('메일 템플릿을 찾을 수 없습니다.');
        }
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function recipients(array $member, array $query): array
    {
        $this->assertSuperAdmin($member);

        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(1000, max(1, (int)($query['per_page'] ?? 50)));
        $levelMin = array_key_exists('level_min', $query) ? (int)$query['level_min'] : null;
        $levelMax = array_key_exists('level_max', $query) ? (int)$query['level_max'] : null;
        $groupId = isset($query['gr_id']) ? trim((string)$query['gr_id']) : null;
        $search = isset($query['search']) ? trim((string)$query['search']) : null;
        $memberIdFrom = isset($query['member_id_from']) ? trim((string)$query['member_id_from']) : null;
        $memberIdTo = isset($query['member_id_to']) ? trim((string)$query['member_id_to']) : null;
        $emailContains = isset($query['email_contains']) ? trim((string)$query['email_contains']) : null;
        $maillingOnly = $this->toBool($query['mailling_only'] ?? false);

        $result = $this->repository->listRecipients(
            $page,
            $perPage,
            $search,
            $levelMin,
            $levelMax,
            $groupId,
            $memberIdFrom,
            $memberIdTo,
            $emailContains,
            $maillingOnly
        );
        $total = (int)($result['total'] ?? 0);
        $lastPage = (int)ceil($total / max(1, $perPage));

        return [
            'items' => array_map(
                static fn (array $recipient): array => AdminMailPresenter::recipient($recipient),
                $result['items']
            ),
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
    private function assertSuperAdmin(array $member): void
    {
        if (!MemberLevel::fromNumeric((int)($member['mb_level'] ?? 0))->isAdmin()) {
            throw ApiException::forbidden('최고관리자만 접근할 수 있습니다.');
        }
    }

    private function normalizePositiveInt(int $value, string $field): int
    {
        if ($value <= 0) {
            throw ApiException::badRequest($field . '는 1 이상의 정수여야 합니다.');
        }

        return $value;
    }

    private function toBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        $normalized = strtolower(trim((string)$value));
        if ($normalized === '') {
            return false;
        }

        return in_array($normalized, ['1', 'true', 'on', 'yes', 'y'], true);
    }
}
