<?php

/**
 * AdminVisitService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\Visit\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\Visit\Service;

use Api\Admin\Visit\Repository\AdminVisitRepository;
use Api\Support\Exception\ApiException;

final class AdminVisitService
{
    public function __construct(private readonly AdminVisitRepository $repository)
    {
    }

    /**
     * @param array<string, mixed> $query
     * @return array{type:string,summary:array<string,mixed>,items:array<int,array<string,mixed>>}
     */
    public function stats(array $query): array
    {
        $dateFrom = $this->normalizeOptionalDate($query['date_from'] ?? null, 'date_from');
        $dateTo = $this->normalizeOptionalDate($query['date_to'] ?? null, 'date_to');
        $type = strtolower(trim((string)($query['type'] ?? 'date')));
        $limit = max(1, min(1000, (int)($query['limit'] ?? 100)));

        $allowedTypes = ['date', 'hour', 'week', 'month', 'year', 'browser', 'os', 'device', 'domain', 'search'];
        if (!in_array($type, $allowedTypes, true)) {
            throw ApiException::badRequest('type은 date/hour/week/month/year/browser/os/device/domain/search 중 하나여야 합니다.');
        }

        $this->assertDateRange($dateFrom, $dateTo);

        $summary = $this->repository->stats($dateFrom, $dateTo);
        $items = $this->repository->statsByType($type, $dateFrom, $dateTo, $limit);

        return [
            'type' => $type,
            'summary' => $summary['summary'] ?? [],
            'items' => $items,
        ];
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function search(array $query): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(200, max(1, (int)($query['per_page'] ?? 50)));
        $dateFrom = $this->normalizeOptionalDate($query['date_from'] ?? null, 'date_from');
        $dateTo = $this->normalizeOptionalDate($query['date_to'] ?? null, 'date_to');
        $ip = isset($query['ip']) ? (string)$query['ip'] : null;
        $referer = isset($query['referer']) ? (string)$query['referer'] : null;
        $agent = isset($query['agent']) ? (string)$query['agent'] : null;

        $this->assertDateRange($dateFrom, $dateTo);

        $result = $this->repository->search($page, $perPage, $dateFrom, $dateTo, $ip, $referer, $agent);

        return [
            'items' => $result['items'],
            'pagination' => [
                'total' => $result['total'],
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => max(1, (int)ceil($result['total'] / $perPage)),
                'has_next' => ($page * $perPage) < (int)$result['total'],
                'has_prev' => $page > 1,
            ],
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string,mixed>
     */
    public function delete(array $payload): array
    {
        $unknown = array_values(array_diff(array_keys($payload), ['before', 'date_from', 'date_to', 'ip']));
        if ($unknown !== []) {
            throw ApiException::badRequest(
                '방문 기록 삭제 요청에 허용되지 않은 필드가 있습니다: ' . implode(', ', $unknown)
            );
        }

        $before = isset($payload['before']) ? trim((string)$payload['before']) : '';
        if ($before !== '') {
            $before = $this->normalizeRequiredDate($before, 'before');

            return [
                'deleted_rows' => $this->repository->deleteBefore($before),
                'before' => $before,
                'date_from' => null,
                'date_to' => null,
                'ip' => null,
            ];
        }

        $dateFrom = $this->normalizeOptionalDate($payload['date_from'] ?? null, 'date_from');
        $dateTo = $this->normalizeOptionalDate($payload['date_to'] ?? null, 'date_to');
        $ip = isset($payload['ip']) ? (string)$payload['ip'] : null;

        $this->assertDateRange($dateFrom, $dateTo);

        return [
            'deleted_rows' => $this->repository->deleteLogs($dateFrom, $dateTo, $ip),
            'before' => null,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'ip' => $ip,
        ];
    }

    private function normalizeRequiredDate(string $value, string $field): string
    {
        return $this->normalizeDateValue($value, $field);
    }

    private function normalizeOptionalDate(mixed $value, string $field): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim((string)$value);
        if ($trimmed === '') {
            return null;
        }

        return $this->normalizeDateValue($trimmed, $field);
    }

    private function normalizeDateValue(string $value, string $field): string
    {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            throw ApiException::badRequest($field . '는 YYYY-MM-DD 형식이어야 합니다.');
        }

        [$year, $month, $day] = array_map('intval', explode('-', $value));
        if ($year < 1000 || $year > 2999 || !checkdate($month, $day, $year)) {
            throw ApiException::badRequest($field . '는 YYYY-MM-DD 형식이어야 합니다.');
        }

        return sprintf('%04d-%02d-%02d', $year, $month, $day);
    }

    private function assertDateRange(?string $dateFrom, ?string $dateTo): void
    {
        if ($dateFrom !== null && $dateTo !== null && strcmp($dateFrom, $dateTo) > 0) {
            throw ApiException::badRequest('date_from은 date_to보다 이후일 수 없습니다.');
        }
    }
}
