<?php

/**
 * AdminPointService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Point\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Point\Service;

use Api\Admin\Point\Repository\AdminPointRepository;
use Api\Admin\Point\Service\Support\AdminPointInputNormalizer;
use Api\Admin\Point\Service\Support\AdminPointPresenter;
use Api\Admin\Point\Service\Support\AdminPointResultBuilder;
use Api\Integration\Contracts\PointMaintenanceGateway;
use Api\Integration\Contracts\PointQueryGateway;
use Api\Integration\Contracts\PointRewardGateway;
use Api\Support\Exception\ApiException;

final class AdminPointService
{
    private ?AdminPointInputNormalizer $resolvedInputNormalizer = null;
    private ?AdminPointResultBuilder $resolvedResultBuilder = null;

    public function __construct(
        private readonly AdminPointRepository $repository,
        private readonly PointQueryGateway $pointQueryGateway,
        private readonly PointRewardGateway $pointRewardGateway,
        private readonly PointMaintenanceGateway $pointMaintenanceGateway,
        ?AdminPointInputNormalizer $inputNormalizer = null,
        ?AdminPointResultBuilder $resultBuilder = null
    ) {
        $this->resolvedInputNormalizer = $inputNormalizer;
        $this->resolvedResultBuilder = $resultBuilder;
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function list(array $query): array
    {
        [$page, $perPage] = $this->inputNormalizer()->pagination($query);
        $memberId = $this->inputNormalizer()->optionalMemberId(isset($query['mb_id']) ? (string)$query['mb_id'] : null);
        $searchField = $this->inputNormalizer()->searchField($query['search_field'] ?? null);
        $search = isset($query['search']) ? trim((string)$query['search']) : null;

        $result = $this->repository->list($page, $perPage, $memberId, $searchField, $search);
        $total = $result['total'];

        return [
            'items' => array_map(
                static fn (array $item): array => AdminPointPresenter::item($item),
                $result['items']
            ),
            'pagination' => $this->resultBuilder()->pagination($page, $perPage, $total),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function grant(array $payload, string $actorId): array
    {
        $payload = $this->inputNormalizer()->pointChange($payload, '관리자 수동 지급');
        $memberId = $payload['mb_id'];
        $point = $payload['point'];

        $member = $this->repository->findMember($memberId);
        if ($member === null) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }

        $content = $payload['po_content'];
        $this->pointRewardGateway->grant(
            $memberId,
            $point,
            $content,
            '@admin',
            $this->resultBuilder()->actorRelId($actorId),
            trim($actorId) === '' ? 'manual' : trim($actorId)
        );

        $updatedMember = $this->repository->findMember($memberId) ?? $member;

        return $this->resultBuilder()->pointChange($memberId, $member, $updatedMember, $point, $content);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function deduct(array $payload, string $actorId): array
    {
        $payload = $this->inputNormalizer()->pointChange($payload, '관리자 수동 차감');
        $memberId = $payload['mb_id'];
        $point = $payload['point'];

        $member = $this->repository->findMember($memberId);
        if ($member === null) {
            throw ApiException::notFound('회원을 찾을 수 없습니다.');
        }
        if ((int)($member['mb_point'] ?? 0) < $point) {
            throw ApiException::badRequest('차감 후 포인트가 0 미만이 될 수 없습니다.');
        }

        $content = $payload['po_content'];
        $this->pointRewardGateway->grant(
            $memberId,
            -$point,
            $content,
            '@admin',
            $this->resultBuilder()->actorRelId($actorId),
            trim($actorId) === '' ? 'manual' : trim($actorId)
        );

        $updatedMember = $this->repository->findMember($memberId) ?? $member;

        return $this->resultBuilder()->pointChange($memberId, $member, $updatedMember, -$point, $content);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, int>
     */
    public function delete(array $payload): array
    {
        $payload = $this->inputNormalizer()->deletion($payload);
        $poIds = $payload['po_ids'];

        $deleted = 0;
        foreach ($poIds as $poId) {
            $target = $this->repository->findPointById($poId);
            if ($target === null) {
                continue;
            }

            $memberId = trim((string)($target['mb_id'] ?? ''));
            if ($memberId === '') {
                continue;
            }

            $this->pointMaintenanceGateway->deleteById($poId, $memberId);
            $deleted++;
        }

        return [
            'requested_count' => count($poIds),
            'deleted_count' => $deleted,
        ];
    }

    /**
     * @param array<string, mixed> $query
     * @return array<string, int|string>
     */
    public function summary(array $query): array
    {
        $memberId = $this->inputNormalizer()->optionalMemberId(isset($query['mb_id']) ? (string)$query['mb_id'] : null);

        return AdminPointPresenter::summary(
            $this->pointQueryGateway->getSummary($memberId === '' ? null : $memberId)
        );
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, int|string>
     */
    public function expire(array $payload): array
    {
        $payload = $this->inputNormalizer()->expiration($payload);

        return AdminPointPresenter::expiration(
            $this->pointMaintenanceGateway->expirePoints($payload['base_date'])
        );
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function executeAction(array $payload, string $actorId): array
    {
        $action = $this->inputNormalizer()->action($payload['action'] ?? null);
        unset($payload['action']);

        return match ($action) {
            'grant' => $this->grant($payload, $actorId),
            'deduct' => $this->deduct($payload, $actorId),
            'expire' => $this->expire($payload),
            default => throw ApiException::badRequest('지원하지 않는 포인트 action 입니다.'),
        };
    }

    private function inputNormalizer(): AdminPointInputNormalizer
    {
        return $this->resolvedInputNormalizer ??= new AdminPointInputNormalizer();
    }

    private function resultBuilder(): AdminPointResultBuilder
    {
        return $this->resolvedResultBuilder ??= new AdminPointResultBuilder();
    }
}
