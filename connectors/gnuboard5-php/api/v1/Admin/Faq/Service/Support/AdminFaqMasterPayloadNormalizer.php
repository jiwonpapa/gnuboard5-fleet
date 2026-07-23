<?php

declare(strict_types=1);

namespace Api\Admin\Faq\Service\Support;

use Api\Support\Exception\ApiException;

final class AdminFaqMasterPayloadNormalizer
{
    private const MUTABLE_FIELDS = [
        'fm_subject',
        'fm_head_html',
        'fm_tail_html',
        'fm_mobile_head_html',
        'fm_mobile_tail_html',
        'fm_order',
    ];

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function create(array $payload): array
    {
        $this->assertOnlyFields($payload, self::MUTABLE_FIELDS, 'FAQ 마스터 생성');

        return [
            'fm_subject' => $this->requiredString($payload, 'fm_subject'),
            'fm_head_html' => $this->optionalString($payload, 'fm_head_html'),
            'fm_tail_html' => $this->optionalString($payload, 'fm_tail_html'),
            'fm_mobile_head_html' => $this->optionalString($payload, 'fm_mobile_head_html'),
            'fm_mobile_tail_html' => $this->optionalString($payload, 'fm_mobile_tail_html'),
            'fm_order' => $this->order($payload['fm_order'] ?? 0),
        ];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function update(array $payload): array
    {
        $this->assertOnlyFields($payload, self::MUTABLE_FIELDS, 'FAQ 마스터 수정');
        if ($payload === []) {
            throw ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $normalized = [];

        if (array_key_exists('fm_subject', $payload)) {
            $normalized['fm_subject'] = $this->requiredString($payload, 'fm_subject');
        }

        foreach (['fm_head_html', 'fm_tail_html', 'fm_mobile_head_html', 'fm_mobile_tail_html'] as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }

            $normalized[$field] = $this->optionalString($payload, $field);
        }

        if (array_key_exists('fm_order', $payload)) {
            $normalized['fm_order'] = $this->order($payload['fm_order']);
        }

        return $normalized;
    }

    public function masterId(int $masterId): int
    {
        if ($masterId <= 0) {
            throw ApiException::badRequest('fm_id는 양수여야 합니다.');
        }

        return $masterId;
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function requiredString(array $payload, string $field): string
    {
        $rawValue = $payload[$field] ?? null;
        if (!is_string($rawValue)) {
            throw ApiException::badRequest($field . '는 문자열이어야 합니다.');
        }

        $value = trim($rawValue);
        if ($value === '') {
            throw ApiException::badRequest($field . '는 필수입니다.');
        }

        return $value;
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function optionalString(array $payload, string $field): string
    {
        $value = $payload[$field] ?? '';
        if (!is_string($value)) {
            throw ApiException::badRequest($field . '는 문자열이어야 합니다.');
        }

        return $value;
    }

    private function order(mixed $value): int
    {
        if (!is_int($value)) {
            throw ApiException::badRequest('fm_order는 정수여야 합니다.');
        }

        return $value;
    }

    /**
     * @param array<string,mixed> $payload
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
