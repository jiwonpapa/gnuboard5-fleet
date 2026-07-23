<?php

/**
 * 관리자 메뉴 생성·수정·재정렬 요청을 closed contract로 검증합니다.
 *
 * @package  Gnuboard5\Api\v1\Admin\Menu\Service\Support
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Admin\Menu\Service\Support;

use Api\Support\Exception\ApiException;

final class AdminMenuPayloadNormalizer
{
    private const MUTABLE_FIELDS = [
        'me_code',
        'me_name',
        'me_link',
        'me_target',
        'me_order',
        'me_use',
        'me_mobile_use',
    ];

    /**
     * @param array<string, mixed> $payload
     * @return array<string, int|string>
     */
    public function create(array $payload): array
    {
        $this->assertOnlyFields($payload, self::MUTABLE_FIELDS, '메뉴 생성');

        return [
            'me_code' => $this->requiredString($payload['me_code'] ?? null, 'me_code'),
            'me_name' => $this->requiredString($payload['me_name'] ?? null, 'me_name'),
            'me_link' => $this->requiredString($payload['me_link'] ?? null, 'me_link'),
            'me_target' => $this->optionalString($payload['me_target'] ?? '_self', 'me_target'),
            'me_order' => $this->nonNegativeInteger($payload['me_order'] ?? 0, 'me_order'),
            'me_use' => $this->flag($payload['me_use'] ?? 1, 'me_use'),
            'me_mobile_use' => $this->flag($payload['me_mobile_use'] ?? 1, 'me_mobile_use'),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, int|string>
     */
    public function update(array $payload): array
    {
        $this->assertOnlyFields($payload, self::MUTABLE_FIELDS, '메뉴 수정');
        if ($payload === []) {
            throw ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $normalized = [];
        foreach (['me_code', 'me_name', 'me_link', 'me_target'] as $field) {
            if (array_key_exists($field, $payload)) {
                $normalized[$field] = $this->optionalString($payload[$field], $field);
            }
        }
        if (array_key_exists('me_order', $payload)) {
            $normalized['me_order'] = $this->nonNegativeInteger($payload['me_order'], 'me_order');
        }
        if (array_key_exists('me_use', $payload)) {
            $normalized['me_use'] = $this->flag($payload['me_use'], 'me_use');
        }
        if (array_key_exists('me_mobile_use', $payload)) {
            $normalized['me_mobile_use'] = $this->flag($payload['me_mobile_use'], 'me_mobile_use');
        }

        return $normalized;
    }

    /**
     * @param array<string, mixed> $payload
     * @return list<array{me_id:int,me_order:int}>
     */
    public function reorder(array $payload): array
    {
        $this->assertOnlyFields($payload, ['orders'], '메뉴 재정렬');
        $orders = $payload['orders'] ?? null;
        if (!is_array($orders) || $orders === []) {
            throw ApiException::badRequest('orders 배열이 필요합니다.');
        }

        $normalized = [];
        foreach ($orders as $item) {
            if (!is_array($item)) {
                throw ApiException::badRequest('orders 항목은 객체여야 합니다.');
            }
            $this->assertOnlyFields($item, ['me_id', 'me_order'], '메뉴 재정렬 항목');
            if (!array_key_exists('me_id', $item) || !array_key_exists('me_order', $item)) {
                throw ApiException::badRequest('orders 항목에는 me_id와 me_order가 필요합니다.');
            }

            $menuId = $this->positiveInteger($item['me_id'], 'me_id');
            $order = $this->nonNegativeInteger($item['me_order'], 'me_order');
            $normalized[] = [
                'me_id' => $menuId,
                'me_order' => $order,
            ];
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
        if ($value === null || (is_string($value) && trim($value) === '')) {
            throw ApiException::badRequest($field . '는 필수입니다.');
        }
        if (!is_string($value)) {
            throw ApiException::badRequest($field . '는 문자열이어야 합니다.');
        }

        return $this->optionalString($value, $field);
    }

    private function optionalString(mixed $value, string $field): string
    {
        if (!is_string($value)) {
            throw ApiException::badRequest($field . '는 문자열이어야 합니다.');
        }

        $normalized = trim($value);
        if ($normalized === '') {
            throw ApiException::badRequest($field . '는 비어 있을 수 없습니다.');
        }

        return $normalized;
    }

    private function positiveInteger(mixed $value, string $field): int
    {
        $normalized = $this->integer($value, $field);
        if ($normalized < 1) {
            throw ApiException::badRequest($field . '는 1 이상이어야 합니다.');
        }

        return $normalized;
    }

    private function nonNegativeInteger(mixed $value, string $field): int
    {
        $normalized = $this->integer($value, $field);
        if ($normalized < 0) {
            throw ApiException::badRequest($field . '는 0 이상이어야 합니다.');
        }

        return $normalized;
    }

    private function flag(mixed $value, string $field): int
    {
        $normalized = $this->integer($value, $field);
        if (!in_array($normalized, [0, 1], true)) {
            throw ApiException::badRequest($field . '는 0 또는 1이어야 합니다.');
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
