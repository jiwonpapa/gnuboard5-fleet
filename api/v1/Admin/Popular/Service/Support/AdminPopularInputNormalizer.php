<?php

declare(strict_types=1);

namespace Api\Admin\Popular\Service\Support;

use Api\Support\Exception\ApiException;

final class AdminPopularInputNormalizer
{
    /** @param array<string,mixed> $input @return array{date_from:?string,date_to:?string} */
    public function dateRange(array $input, bool $rejectUnknown = false): array
    {
        if ($rejectUnknown) {
            $unknown = array_values(array_diff(array_keys($input), ['date_from', 'date_to']));
            if ($unknown !== []) {
                throw ApiException::badRequest(
                    '인기 검색어 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown)
                );
            }
        }

        $from = $this->optionalDate($input['date_from'] ?? null, 'date_from');
        $to = $this->optionalDate($input['date_to'] ?? null, 'date_to');
        if ($from !== null && $to !== null && $from > $to) {
            throw ApiException::badRequest('date_from은 date_to보다 늦을 수 없습니다.');
        }

        return ['date_from' => $from, 'date_to' => $to];
    }

    private function optionalDate(mixed $value, string $field): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_string($value)) {
            throw ApiException::badRequest($field . '는 YYYY-MM-DD 형식이어야 합니다.');
        }
        $date = trim($value);
        $parsed = \DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        if ($parsed === false || $parsed->format('Y-m-d') !== $date) {
            throw ApiException::badRequest($field . '는 YYYY-MM-DD 형식이어야 합니다.');
        }

        return $date;
    }
}
