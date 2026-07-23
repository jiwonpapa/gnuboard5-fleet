<?php

declare(strict_types=1);

namespace Api\Admin\Faq\Service\Support;

use Api\Support\Exception\ApiException;

final class AdminFaqInputNormalizer
{
    private const MUTABLE_FIELDS = ['fm_id', 'fa_subject', 'fa_content', 'fa_order'];

    /**
     * @param array<string, mixed> $query
     * @return array{page:int, per_page:int, fm_id:?int}
     */
    public function normalizeListQuery(array $query): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(100, max(1, (int)($query['per_page'] ?? 20)));
        $masterId = isset($query['fm_id']) ? (int)$query['fm_id'] : null;

        if ($masterId !== null && $masterId <= 0) {
            throw ApiException::badRequest('fm_id는 양수여야 합니다.');
        }

        return [
            'page' => $page,
            'per_page' => $perPage,
            'fm_id' => $masterId,
        ];
    }

    public function assertFaqId(int $faqId): void
    {
        if ($faqId <= 0) {
            throw ApiException::badRequest('fa_id는 양수여야 합니다.');
        }
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{fm_id:int, fa_subject:string, fa_content:string, fa_order:int}
     */
    public function normalizeCreatePayload(array $payload): array
    {
        $this->assertOnlyFields($payload, self::MUTABLE_FIELDS, 'FAQ 생성');

        return [
            'fm_id' => $this->positiveInteger($payload['fm_id'] ?? null, 'fm_id'),
            'fa_subject' => $this->requiredString($payload['fa_subject'] ?? null, 'fa_subject'),
            'fa_content' => $this->requiredString($payload['fa_content'] ?? null, 'fa_content'),
            'fa_order' => $this->integer($payload['fa_order'] ?? 0, 'fa_order'),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, int|string>
     */
    public function normalizeUpdatePayload(array $payload): array
    {
        $this->assertOnlyFields($payload, self::MUTABLE_FIELDS, 'FAQ 수정');
        if ($payload === []) {
            throw ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $normalized = [];
        if (array_key_exists('fm_id', $payload)) {
            $normalized['fm_id'] = $this->positiveInteger($payload['fm_id'], 'fm_id');
        }
        foreach (['fa_subject', 'fa_content'] as $field) {
            if (array_key_exists($field, $payload)) {
                $normalized[$field] = $this->requiredString($payload[$field], $field);
            }
        }
        if (array_key_exists('fa_order', $payload)) {
            $normalized['fa_order'] = $this->integer($payload['fa_order'], 'fa_order');
        }

        return $normalized;
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

    private function requiredString(mixed $value, string $field): string
    {
        if (!is_string($value)) {
            throw ApiException::badRequest($field . '는 문자열이어야 합니다.');
        }

        $normalized = trim($value);
        if ($normalized === '') {
            throw ApiException::badRequest($field . '는 필수입니다.');
        }

        return $normalized;
    }

    private function positiveInteger(mixed $value, string $field): int
    {
        $normalized = $this->integer($value, $field);
        if ($normalized <= 0) {
            throw ApiException::badRequest($field . '는 양수여야 합니다.');
        }

        return $normalized;
    }

    private function integer(mixed $value, string $field): int
    {
        if (!is_int($value)) {
            throw ApiException::badRequest($field . '는 정수여야 합니다.');
        }

        return $value;
    }
}
