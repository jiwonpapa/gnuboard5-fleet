<?php

/**
 * 관리자 콘텐츠 생성·수정 payload를 canonical DB 타입으로 정규화합니다.
 *
 * @package  Gnuboard5\Api\v1\Admin\Content\Service\Support
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Admin\Content\Service\Support;

use Api\Support\Exception\ApiException;

final class AdminContentPayloadNormalizer
{
    private const CREATE_FIELDS = [
        'co_id',
        'co_subject',
        'co_html',
        'co_content',
        'co_mobile_content',
        'co_include_head',
        'co_include_tail',
        'co_tag_filter_use',
        'co_skin',
        'co_mobile_skin',
    ];

    private const UPDATE_FIELDS = [
        'co_subject',
        'co_html',
        'co_content',
        'co_mobile_content',
        'co_include_head',
        'co_include_tail',
        'co_tag_filter_use',
        'co_skin',
        'co_mobile_skin',
    ];

    /**
     * @param array<string, mixed> $payload
     * @return array<string, int|string>
     */
    public function create(array $payload): array
    {
        $this->assertOnlyFields($payload, self::CREATE_FIELDS, '콘텐츠 생성');

        return [
            'co_id' => $this->contentId($payload['co_id'] ?? null),
            'co_subject' => $this->requiredString($payload['co_subject'] ?? null, 'co_subject'),
            'co_html' => $this->htmlMode($payload['co_html'] ?? 0),
            'co_content' => $this->requiredString($payload['co_content'] ?? null, 'co_content'),
            'co_mobile_content' => $this->string($payload['co_mobile_content'] ?? '', 'co_mobile_content'),
            'co_include_head' => $this->string($payload['co_include_head'] ?? '', 'co_include_head'),
            'co_include_tail' => $this->string($payload['co_include_tail'] ?? '', 'co_include_tail'),
            'co_tag_filter_use' => $this->flag($payload['co_tag_filter_use'] ?? 1, 'co_tag_filter_use'),
            'co_skin' => $this->string($payload['co_skin'] ?? '', 'co_skin'),
            'co_mobile_skin' => $this->string($payload['co_mobile_skin'] ?? '', 'co_mobile_skin'),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, int|string>
     */
    public function update(array $payload): array
    {
        $this->assertOnlyFields($payload, self::UPDATE_FIELDS, '콘텐츠 수정');
        if ($payload === []) {
            throw ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $normalized = [];
        foreach (['co_subject', 'co_content'] as $field) {
            if (array_key_exists($field, $payload)) {
                $normalized[$field] = $this->requiredString($payload[$field], $field);
            }
        }
        foreach (['co_mobile_content', 'co_include_head', 'co_include_tail', 'co_skin', 'co_mobile_skin'] as $field) {
            if (array_key_exists($field, $payload)) {
                $normalized[$field] = $this->string($payload[$field], $field);
            }
        }
        if (array_key_exists('co_html', $payload)) {
            $normalized['co_html'] = $this->htmlMode($payload['co_html']);
        }
        if (array_key_exists('co_tag_filter_use', $payload)) {
            $normalized['co_tag_filter_use'] = $this->flag($payload['co_tag_filter_use'], 'co_tag_filter_use');
        }

        return $normalized;
    }

    public function contentId(mixed $value): string
    {
        if (!is_string($value)) {
            throw ApiException::badRequest('co_id는 문자열이어야 합니다.');
        }

        $normalized = trim($value);
        if ($normalized === '' || preg_match('/^[a-zA-Z0-9_]{1,20}$/', $normalized) !== 1) {
            throw ApiException::badRequest('co_id 형식이 올바르지 않습니다.');
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
        $normalized = trim($this->string($value, $field));
        if ($normalized === '') {
            throw ApiException::badRequest($field . '는 필수입니다.');
        }

        return $normalized;
    }

    private function string(mixed $value, string $field): string
    {
        if (!is_string($value)) {
            throw ApiException::badRequest($field . '는 문자열이어야 합니다.');
        }

        return $value;
    }

    private function htmlMode(mixed $value): int
    {
        $normalized = $this->integer($value, 'co_html');
        if (!in_array($normalized, [0, 1, 2], true)) {
            throw ApiException::badRequest('co_html은 0, 1, 2 중 하나여야 합니다.');
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
