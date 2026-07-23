<?php

/**
 * AdminWriteCountService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\WriteCount\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\WriteCount\Service;

use Api\Admin\WriteCount\Repository\AdminWriteCountRepository;
use Api\Support\Exception\ApiException;

final class AdminWriteCountService
{
    public function __construct(private readonly AdminWriteCountRepository $repository)
    {
    }

    /**
     * @param array<string,mixed> $query
     * @return array<string,mixed>
     */
    public function stats(array $query): array
    {
        $period = strtolower(trim((string)($query['period'] ?? 'day')));
        if (!in_array($period, ['hour', 'day', 'week', 'month', 'year'], true)) {
            throw ApiException::badRequest('period는 hour/day/week/month/year 중 하나여야 합니다.');
        }

        $dateFrom = trim((string)($query['date_from'] ?? date('Y-m-d', strtotime('-30 days') ?: time())));
        $dateTo = trim((string)($query['date_to'] ?? date('Y-m-d')));
        if (!$this->isDate($dateFrom) || !$this->isDate($dateTo)) {
            throw ApiException::badRequest('date_from/date_to는 YYYY-MM-DD 형식이어야 합니다.');
        }
        if ($dateFrom > $dateTo) {
            throw ApiException::badRequest('date_from은 date_to보다 클 수 없습니다.');
        }

        $boTable = isset($query['bo_table']) ? trim((string)$query['bo_table']) : null;
        if ($boTable !== null && $boTable !== '' && preg_match('/^[a-zA-Z0-9_]{1,20}$/', $boTable) !== 1) {
            throw ApiException::badRequest('bo_table 형식이 올바르지 않습니다.');
        }

        $rows = $this->repository->stats($period, $dateFrom, $dateTo, $boTable);
        $items = [];
        $writeTotal = 0;
        $commentTotal = 0;
        foreach ($rows as $row) {
            $item = [
                'bucket' => (string)($row['bucket'] ?? ''),
                'write_count' => (int)($row['write_count'] ?? 0),
                'comment_count' => (int)($row['comment_count'] ?? 0),
            ];
            $items[] = $item;
            $writeTotal += $item['write_count'];
            $commentTotal += $item['comment_count'];
        }

        return [
            'period' => $period,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'bo_table' => $boTable,
            'summary' => [
                'write_total' => $writeTotal,
                'comment_total' => $commentTotal,
            ],
            'items' => $items,
        ];
    }

    private function isDate(string $value): bool
    {
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        return $date !== false && $date->format('Y-m-d') === $value;
    }
}
