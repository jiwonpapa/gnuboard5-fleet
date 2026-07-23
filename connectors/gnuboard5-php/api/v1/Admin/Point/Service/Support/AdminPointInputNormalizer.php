<?php

declare(strict_types=1);

namespace Api\Admin\Point\Service\Support;

use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;

final class AdminPointInputNormalizer
{
    private const POINT_CHANGE_FIELDS = ['mb_id', 'point', 'po_content'];

    /**
     * @param array<string,mixed> $query
     * @return array{0:int,1:int}
     */
    public function pagination(array $query): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(100, max(1, (int)($query['per_page'] ?? 20)));

        return [$page, $perPage];
    }

    public function optionalMemberId(?string $memberId): ?string
    {
        $value = trim((string)$memberId);

        return $value === '' ? null : $value;
    }

    public function requiredMemberId(string $memberId): string
    {
        $value = trim($memberId);
        if ($value === '' || preg_match(ValidationPatterns::MEMBER_ID, $value) !== 1) {
            throw ApiException::badRequest('mb_id 형식이 올바르지 않습니다.');
        }

        return $value;
    }

    public function searchField(mixed $searchField): ?string
    {
        if ($searchField === null || trim((string)$searchField) === '') {
            return null;
        }

        $value = trim((string)$searchField);
        if (!in_array($value, ['mb_id', 'po_content'], true)) {
            throw ApiException::badRequest('search_field는 mb_id 또는 po_content여야 합니다.');
        }

        return $value;
    }

    public function action(mixed $action): string
    {
        if (!is_string($action)) {
            throw ApiException::badRequest('action은 문자열이어야 합니다.');
        }

        $value = trim($action);
        if (!in_array($value, ['grant', 'deduct', 'expire'], true)) {
            throw ApiException::badRequest('action은 grant, deduct, expire 중 하나여야 합니다.');
        }

        return $value;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{mb_id:string,point:int,po_content:string}
     */
    public function pointChange(array $payload, string $defaultContent): array
    {
        $this->assertOnlyFields($payload, self::POINT_CHANGE_FIELDS, '포인트 증감');
        $memberId = $payload['mb_id'] ?? null;
        if (!is_string($memberId)) {
            throw ApiException::badRequest('mb_id는 문자열이어야 합니다.');
        }

        $point = $payload['point'] ?? null;
        if (!is_int($point) || $point < 1) {
            throw ApiException::badRequest('point는 1 이상의 정수여야 합니다.');
        }

        $content = $payload['po_content'] ?? $defaultContent;
        if (!is_string($content)) {
            throw ApiException::badRequest('po_content는 문자열이어야 합니다.');
        }
        $content = trim($content);
        if ($content === '') {
            $content = $defaultContent;
        }

        return [
            'mb_id' => $this->requiredMemberId($memberId),
            'point' => $point,
            'po_content' => $content,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{po_ids:list<int>}
     */
    public function deletion(array $payload): array
    {
        $this->assertOnlyFields($payload, ['po_ids'], '포인트 삭제');

        return ['po_ids' => $this->poIds($payload['po_ids'] ?? null)];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{base_date:?string}
     */
    public function expiration(array $payload): array
    {
        $this->assertOnlyFields($payload, ['base_date'], '포인트 만료');
        if (!array_key_exists('base_date', $payload) || $payload['base_date'] === null || $payload['base_date'] === '') {
            return ['base_date' => null];
        }
        if (!is_string($payload['base_date'])) {
            throw ApiException::badRequest('base_date는 YYYY-MM-DD 문자열이어야 합니다.');
        }

        $baseDate = trim($payload['base_date']);
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $baseDate);
        if ($date === false || $date->format('Y-m-d') !== $baseDate) {
            throw ApiException::badRequest('base_date는 유효한 YYYY-MM-DD 날짜여야 합니다.');
        }

        return ['base_date' => $baseDate];
    }

    /**
     * @return array<int,int>
     */
    public function poIds(mixed $value): array
    {
        if (!is_array($value) || $value === []) {
            throw ApiException::badRequest('po_ids는 1개 이상의 정수 배열이어야 합니다.');
        }

        $ids = [];
        foreach ($value as $candidate) {
            if (!is_int($candidate) || $candidate <= 0) {
                throw ApiException::badRequest('po_ids에는 1 이상의 정수만 허용됩니다.');
            }

            $ids[] = (int)$candidate;
        }

        return array_values(array_unique($ids));
    }

    /**
     * @param array<string, mixed> $payload
     * @param list<string> $allowed
     */
    private function assertOnlyFields(array $payload, array $allowed, string $context): void
    {
        $unknown = array_values(array_diff(array_keys($payload), $allowed));
        if ($unknown !== []) {
            throw ApiException::badRequest($context . ' 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown));
        }
    }
}
