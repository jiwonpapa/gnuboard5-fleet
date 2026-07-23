<?php

declare(strict_types=1);

namespace Api\Admin\Group\Service\Support;

use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;

final class AdminGroupInputNormalizer
{
    /** @var list<string> */
    private const CREATE_FIELDS = ['gr_id', 'gr_subject', 'gr_admin', 'gr_device', 'gr_use_access'];

    /** @var list<string> */
    private const UPDATE_FIELDS = ['gr_subject', 'gr_admin', 'gr_device', 'gr_use_access'];

    /**
     * @param array<string, mixed> $payload
     * @return array{gr_id:string, gr_subject:string, gr_admin:string, gr_device:string, gr_use_access:int}
     */
    public function normalizeCreatePayload(array $payload): array
    {
        $this->assertAllowedFields($payload, self::CREATE_FIELDS);

        return [
            'gr_id' => $this->normalizeGroupId((string)($payload['gr_id'] ?? '')),
            'gr_subject' => $this->requireSubject($payload['gr_subject'] ?? null),
            'gr_admin' => trim((string)($payload['gr_admin'] ?? '')),
            'gr_device' => $this->normalizeDevice($payload['gr_device'] ?? 'both'),
            'gr_use_access' => $this->normalizeBoolFlag($payload['gr_use_access'] ?? 0),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function normalizeUpdatePayload(array $payload): array
    {
        $this->assertAllowedFields($payload, self::UPDATE_FIELDS);
        $normalized = [
            'gr_subject' => $this->requireSubject($payload['gr_subject'] ?? null),
        ];
        if (array_key_exists('gr_admin', $payload)) {
            $normalized['gr_admin'] = trim((string)$payload['gr_admin']);
        }
        if (array_key_exists('gr_device', $payload)) {
            $normalized['gr_device'] = $this->normalizeDevice($payload['gr_device']);
        }
        if (array_key_exists('gr_use_access', $payload)) {
            $normalized['gr_use_access'] = $this->normalizeBoolFlag($payload['gr_use_access']);
        }

        return $normalized;
    }

    public function normalizeGroupId(string $groupId): string
    {
        $value = trim($groupId);
        if ($value === '' || preg_match(ValidationPatterns::GROUP_ID, $value) !== 1) {
            throw ApiException::badRequest('gr_id 형식이 올바르지 않습니다.');
        }

        return $value;
    }

    public function requireSubject(mixed $value): string
    {
        $subject = trim((string)$value);
        if ($subject === '') {
            throw ApiException::badRequest('gr_subject는 필수입니다.');
        }

        return $subject;
    }

    public function normalizeBoolFlag(mixed $value): int
    {
        if (!is_int($value) || !in_array($value, [0, 1], true)) {
            throw ApiException::badRequest('gr_use_access는 0 또는 1이어야 합니다.');
        }

        return $value;
    }

    public function normalizeDevice(mixed $value): string
    {
        $device = trim((string)$value);
        if (!in_array($device, ['both', 'pc', 'mobile'], true)) {
            throw ApiException::badRequest('gr_device 값이 올바르지 않습니다.');
        }

        return $device;
    }

    public function normalizeMemberId(string $memberId): string
    {
        $normalized = trim($memberId);
        if ($normalized === '' || preg_match(ValidationPatterns::MEMBER_ID, $normalized) !== 1) {
            throw ApiException::badRequest('mb_id 형식이 올바르지 않습니다.');
        }

        return $normalized;
    }

    /** @param array<string, mixed> $payload */
    public function normalizeMemberPayload(array $payload): string
    {
        $this->assertAllowedFields($payload, ['mb_id']);

        return $this->normalizeMemberId((string)($payload['mb_id'] ?? ''));
    }

    /**
     * @param array<string, mixed> $query
     * @return array{page:int, per_page:int, search:?string}
     */
    public function normalizeMemberListQuery(array $query): array
    {
        return [
            'page' => max(1, (int)($query['page'] ?? 1)),
            'per_page' => min(200, max(1, (int)($query['per_page'] ?? 50))),
            'search' => isset($query['search']) ? trim((string)$query['search']) : null,
        ];
    }

    /** @param array<string, mixed> $payload @param list<string> $allowed */
    private function assertAllowedFields(array $payload, array $allowed): void
    {
        $unknown = array_values(array_diff(array_keys($payload), $allowed));
        if ($unknown !== []) {
            throw ApiException::badRequest('그룹 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown));
        }
    }
}
