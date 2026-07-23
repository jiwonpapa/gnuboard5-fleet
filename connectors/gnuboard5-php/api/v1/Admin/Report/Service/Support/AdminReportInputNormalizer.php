<?php

declare(strict_types=1);

namespace Api\Admin\Report\Service\Support;

use Api\Support\Exception\ApiException;

final class AdminReportInputNormalizer
{
    private const STATUSES = ['pending', 'approved', 'rejected', 'hold'];

    private const TARGET_TYPES = ['post', 'comment', 'member'];

    /** @param array<string,mixed> $query @return array{page:int,per_page:int,status:?string,target_type:?string} */
    public function listQuery(array $query): array
    {
        $status = $this->optionalEnum($query['status'] ?? null, self::STATUSES, 'status');
        $targetType = $this->optionalEnum($query['target_type'] ?? null, self::TARGET_TYPES, 'target_type');

        return [
            'page' => max(1, (int)($query['page'] ?? 1)),
            'per_page' => max(1, min(100, (int)($query['per_page'] ?? 20))),
            'status' => $status,
            'target_type' => $targetType,
        ];
    }

    /** @param array<string,mixed> $payload @return array{status:string,admin_memo:string} */
    public function updatePayload(array $payload): array
    {
        $unknown = array_values(array_diff(array_keys($payload), ['status', 'admin_memo']));
        if ($unknown !== []) {
            throw ApiException::badRequest(
                '신고 처리 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown)
            );
        }

        $status = $this->optionalEnum($payload['status'] ?? null, self::STATUSES, 'status');
        if ($status === null) {
            throw ApiException::badRequest('status 값이 올바르지 않습니다.');
        }

        $memo = '';
        if (array_key_exists('admin_memo', $payload)) {
            if (!is_string($payload['admin_memo'])) {
                throw ApiException::badRequest('admin_memo는 문자열이어야 합니다.');
            }
            $memo = trim($payload['admin_memo']);
        }

        return ['status' => $status, 'admin_memo' => $memo];
    }

    /** @param list<string> $allowed */
    private function optionalEnum(mixed $value, array $allowed, string $field): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_string($value)) {
            throw ApiException::badRequest($field . ' 값이 올바르지 않습니다.');
        }

        $normalized = trim($value);
        if (!in_array($normalized, $allowed, true)) {
            throw ApiException::badRequest($field . ' 값이 올바르지 않습니다.');
        }

        return $normalized;
    }
}
