<?php

/**
 * AdminPollInputNormalizer API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Poll\Service\Support
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Poll\Service\Support;

use Api\Core\Util\G5DateTime;
use Api\Support\Exception\ApiException;

final class AdminPollInputNormalizer
{
    private const OPTION_FIELDS = [
        'po_poll1',
        'po_poll2',
        'po_poll3',
        'po_poll4',
        'po_poll5',
        'po_poll6',
        'po_poll7',
        'po_poll8',
        'po_poll9',
    ];

    private const MUTABLE_FIELDS = [
        'po_subject',
        'options',
        ...self::OPTION_FIELDS,
        'po_etc',
        'po_level',
        'po_point',
        'po_use',
    ];

    /**
     * @param array<string,mixed> $query
     * @return array{page:int,per_page:int}
     */
    public function normalizeListQuery(array $query): array
    {
        return [
            'page' => max(1, (int)($query['page'] ?? 1)),
            'per_page' => min(100, max(1, (int)($query['per_page'] ?? 20))),
        ];
    }

    public function requirePollId(int $pollId): int
    {
        if ($pollId <= 0) {
            throw ApiException::badRequest('po_id는 1 이상의 정수여야 합니다.');
        }

        return $pollId;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function normalizeCreatePayload(array $payload): array
    {
        $this->assertAllowedFields($payload, [...self::MUTABLE_FIELDS, 'po_date']);
        $normalized = $this->normalizeMutablePayload($payload, false);
        $normalized['po_date'] = $this->normalizeDate($payload['po_date'] ?? G5DateTime::today());

        return $normalized;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function normalizeUpdatePayload(array $payload): array
    {
        $this->assertAllowedFields($payload, self::MUTABLE_FIELDS);

        return $this->normalizeMutablePayload($payload, true);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function normalizePollPayload(array $payload, bool $partial = false): array
    {
        return $partial
            ? $this->normalizeUpdatePayload($payload)
            : $this->normalizeCreatePayload($payload);
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private function normalizeMutablePayload(array $payload, bool $partial): array
    {
        $normalized = [];

        if (!$partial || array_key_exists('po_subject', $payload)) {
            $subject = trim($this->stringValue('po_subject', $payload['po_subject'] ?? ''));
            if ($subject === '') {
                throw ApiException::badRequest('po_subject는 필수입니다.');
            }
            $normalized['po_subject'] = $subject;
        }

        foreach ($this->normalizeOptions($payload, $partial) as $key => $value) {
            $normalized[$key] = $value;
        }

        if (!$partial || array_key_exists('po_etc', $payload)) {
            $normalized['po_etc'] = $this->normalizeEtcQuestion($payload['po_etc'] ?? '');
        }
        if (!$partial || array_key_exists('po_level', $payload)) {
            $level = $this->integerValue('po_level', $payload['po_level'] ?? 1);
            $normalized['po_level'] = max(1, $level);
        }
        if (!$partial || array_key_exists('po_point', $payload)) {
            $normalized['po_point'] = $this->integerValue('po_point', $payload['po_point'] ?? 0);
        }
        if (!$partial || array_key_exists('po_use', $payload)) {
            $normalized['po_use'] = $this->toBoolInt($payload['po_use'] ?? 1);
        }
        return $normalized;
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,string>
     */
    private function normalizeOptions(array $payload, bool $partial): array
    {
        $options = [];
        $rawOptions = $payload['options'] ?? null;
        if (is_array($rawOptions)) {
            $index = 1;
            foreach ($rawOptions as $rawOption) {
                if ($index > 9) {
                    break;
                }

                $text = trim($this->stringValue('options[]', $rawOption));
                if ($text === '') {
                    $index++;
                    continue;
                }

                $options['po_poll' . $index] = $text;
                $index++;
            }
        } else {
            foreach (self::OPTION_FIELDS as $field) {
                if (!$partial || array_key_exists($field, $payload)) {
                    $options[$field] = trim($this->stringValue($field, $payload[$field] ?? ''));
                }
            }
        }

        if (!$partial) {
            $nonEmpty = array_values(array_filter($options, static fn (string $text): bool => $text !== ''));
            if (count($nonEmpty) < 2) {
                throw ApiException::badRequest('투표 항목은 최소 2개 이상 필요합니다.');
            }

            foreach (self::OPTION_FIELDS as $field) {
                if (!array_key_exists($field, $options)) {
                    $options[$field] = '';
                }
            }
        } else {
            $hasProvidedOption = false;
            $nonEmptyProvided = 0;
            foreach (self::OPTION_FIELDS as $field) {
                if (!array_key_exists($field, $options)) {
                    continue;
                }
                $hasProvidedOption = true;
                if ($options[$field] !== '') {
                    $nonEmptyProvided++;
                }
            }

            if ($hasProvidedOption && $nonEmptyProvided === 0) {
                throw ApiException::badRequest('수정할 투표 항목이 없습니다.');
            }
        }

        return $options;
    }

    private function toBoolInt(mixed $value): int
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if (is_int($value) && in_array($value, [0, 1], true)) {
            return $value;
        }
        if (!is_string($value)) {
            throw ApiException::badRequest('투표 플래그는 0 또는 1이어야 합니다.');
        }

        $normalized = strtolower(trim($value));
        if (in_array($normalized, ['1', 'true', 'on', 'yes', 'y'], true)) {
            return 1;
        }
        if (in_array($normalized, ['0', 'false', 'off', 'no', 'n'], true)) {
            return 0;
        }

        throw ApiException::badRequest('투표 플래그는 0 또는 1이어야 합니다.');
    }

    /** @param array<string,mixed> $payload @param list<string> $allowed */
    private function assertAllowedFields(array $payload, array $allowed): void
    {
        $unknown = array_values(array_diff(array_keys($payload), $allowed));
        if ($unknown !== []) {
            throw ApiException::badRequest('투표 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown));
        }
    }

    private function stringValue(string $field, mixed $value): string
    {
        if (!is_string($value)) {
            throw ApiException::badRequest($field . ' 값은 문자열이어야 합니다.');
        }

        return $value;
    }

    private function integerValue(string $field, mixed $value): int
    {
        if (is_int($value)) {
            return $value;
        }
        if (!is_string($value) || preg_match('/^-?\d+$/', trim($value)) !== 1) {
            throw ApiException::badRequest($field . ' 값은 정수여야 합니다.');
        }

        return (int)trim($value);
    }

    private function normalizeEtcQuestion(mixed $value): string
    {
        $question = trim($this->stringValue('po_etc', $value));
        $length = function_exists('mb_strlen') ? mb_strlen($question, 'UTF-8') : strlen($question);
        if ($length > 125) {
            throw ApiException::badRequest('po_etc는 125자 이하여야 합니다.');
        }

        return $question;
    }

    private function normalizeDate(mixed $value): string
    {
        $date = trim($this->stringValue('po_date', $value));
        $parsed = \DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        if ($parsed === false || $parsed->format('Y-m-d') !== $date) {
            throw ApiException::badRequest('po_date는 YYYY-MM-DD 형식이어야 합니다.');
        }

        return $date;
    }
}
