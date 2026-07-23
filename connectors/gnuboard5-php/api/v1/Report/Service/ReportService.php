<?php

/**
 * ReportService API module.
 *
 * @package  Gnuboard5\Api\v1\Report\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Report\Service;

use Api\Core\Enum\ReportStatus;
use Api\Core\Enum\ReportTargetType;
use Api\Core\Util\G5DateTime;
use Api\Report\Repository\ReportRepository;
use Api\Support\Exception\ApiException;

final class ReportService
{
    private const REASONS = ['spam', 'abuse', 'adult', 'privacy', 'copyright', 'other'];

    public function __construct(private readonly ReportRepository $repository)
    {
    }

    public function create(array $member, array $payload): array
    {
        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 토큰이 필요합니다.');
        }

        $targetType = ReportTargetType::tryFrom(strtolower(trim((string)($payload['target_type'] ?? ''))));
        $targetId = trim((string)($payload['target_id'] ?? ''));
        $reason = strtolower(trim((string)($payload['reason'] ?? '')));
        $detail = trim((string)($payload['detail'] ?? ''));

        if (!$targetType instanceof ReportTargetType) {
            throw ApiException::badRequest('target_type이 올바르지 않습니다.');
        }
        if ($targetId === '') {
            throw ApiException::badRequest('target_id는 필수입니다.');
        }
        if (!in_array($reason, self::REASONS, true)) {
            throw ApiException::badRequest('reason이 올바르지 않습니다.');
        }

        if ($this->repository->findDuplicate($memberId, $targetType->value, $targetId)) {
            throw ApiException::conflict('이미 동일 대상에 대한 신고가 접수되어 있습니다.');
        }

        $created = $this->repository->create(
            $memberId,
            $targetType->value,
            $targetId,
            $reason,
            $detail,
            G5DateTime::now()
        );

        return [
            'report_id' => (int)($created['rp_id'] ?? 0),
            'target_type' => (string)($created['rp_target_type'] ?? $targetType->value),
            'target_id' => (string)($created['rp_target_id'] ?? $targetId),
            'reason' => (string)($created['rp_reason'] ?? $reason),
            'status' => (string)($created['rp_status'] ?? ReportStatus::Pending->value),
            'created_at' => (string)($created['rp_datetime'] ?? G5DateTime::now()),
        ];
    }
}
