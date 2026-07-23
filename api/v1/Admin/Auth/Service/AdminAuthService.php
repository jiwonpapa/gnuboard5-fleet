<?php

/**
 * AdminAuthService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Auth\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Auth\Service;

use Api\Admin\Auth\Repository\AdminAuthRepository;
use Api\Admin\Auth\Service\Support\AdminAuthPayloadNormalizer;
use Api\Admin\Auth\Service\Support\AdminAuthPresenter;
use Api\Core\Enum\MemberLevel;
use Api\Support\Exception\ApiException;

final class AdminAuthService
{
    private readonly AdminAuthPayloadNormalizer $payloadNormalizer;
    private readonly AdminAuthPresenter $presenter;

    public function __construct(
        private readonly AdminAuthRepository $repository,
        ?AdminAuthPayloadNormalizer $payloadNormalizer = null,
        ?AdminAuthPresenter $presenter = null
    ) {
        $this->payloadNormalizer = $payloadNormalizer ?? new AdminAuthPayloadNormalizer();
        $this->presenter = $presenter ?? new AdminAuthPresenter();
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function list(array $member, array $query): array
    {
        $this->assertSuperAdmin($member);

        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(100, max(1, (int)($query['per_page'] ?? 20)));
        $memberId = isset($query['mb_id']) ? $this->payloadNormalizer->normalizeMemberId((string)$query['mb_id']) : null;
        $dateFrom = $this->payloadNormalizer->normalizeOptionalDate($query['date_from'] ?? null, 'date_from');
        $dateTo = $this->payloadNormalizer->normalizeOptionalDate($query['date_to'] ?? null, 'date_to');
        if ($dateFrom !== null && $dateTo !== null && $dateFrom > $dateTo) {
            throw ApiException::badRequest('date_from은 date_to보다 늦을 수 없습니다.');
        }

        $result = $this->repository->list($page, $perPage, $memberId, $dateFrom, $dateTo);

        return $this->presenter->presentList($result, $page, $perPage);
    }

    /**
     * @param array<string,mixed> $member
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function upsert(string $targetMemberId, array $payload, array $member): array
    {
        $this->assertSuperAdmin($member);
        $normalizedTarget = $this->payloadNormalizer->normalizeMemberId($targetMemberId);

        $targetMember = $this->repository->findMember($normalizedTarget);
        if ($targetMember === null) {
            throw ApiException::notFound('대상 회원을 찾을 수 없습니다.');
        }

        $authRows = $this->payloadNormalizer->normalizeAuthRows($payload);
        if ($authRows === []) {
            throw ApiException::badRequest('auths는 1개 이상의 권한 설정이 필요합니다.');
        }

        $this->repository->replaceMemberAuth($normalizedTarget, $authRows);

        return [
            'mb_id' => $normalizedTarget,
            'mb_name' => (string)($targetMember['mb_name'] ?? ''),
            'mb_nick' => (string)($targetMember['mb_nick'] ?? ''),
            'auths' => $authRows,
        ];
    }

    /**
     * @param array<string,mixed> $member
     */
    public function deleteByMember(string $targetMemberId, array $member): void
    {
        $this->assertSuperAdmin($member);
        $normalizedTarget = $this->payloadNormalizer->normalizeMemberId($targetMemberId);
        $actorMemberId = trim((string)($member['mb_id'] ?? ''));

        if ($actorMemberId !== '' && $actorMemberId === $normalizedTarget) {
            throw ApiException::forbidden('자기 자신의 권한은 삭제할 수 없습니다.');
        }

        if (!$this->repository->memberExists($normalizedTarget)) {
            throw ApiException::notFound('대상 회원을 찾을 수 없습니다.');
        }

        $deleted = $this->repository->deleteByMember($normalizedTarget);
        if ($deleted <= 0) {
            throw ApiException::notFound('삭제할 권한 항목이 없습니다.');
        }
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
}
