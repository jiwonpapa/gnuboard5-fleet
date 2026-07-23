<?php

declare(strict_types=1);

namespace Api\Admin\Sms\Repository;

use DateTimeImmutable;

abstract class AdminSmsMessageStoreBase extends AdminSmsRepositoryBase
{
    /**
     * @return array{db_value:string,provider_key:string,api_value:string|null}
     */
    protected function normalizeBookingAt(mixed $value): array
    {
        $raw = trim((string)$value);
        if ($raw === '') {
            return [
                'db_value' => '0000-00-00 00:00:00',
                'provider_key' => '',
                'api_value' => null,
            ];
        }

        $date = new DateTimeImmutable($raw);
        $normalized = $date->format('Y-m-d H:i:00');

        return [
            'db_value' => $normalized,
            'provider_key' => $date->format('YmdHi'),
            'api_value' => $normalized,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    protected function parseDuplicateMemo(string $raw): array
    {
        if ($raw === '') {
            return ['total' => 0, 'phones' => []];
        }

        $parsed = @unserialize($raw);
        if (!is_array($parsed)) {
            return ['total' => 0, 'phones' => []];
        }

        return [
            'total' => (int)($parsed['total'] ?? 0),
            'phones' => array_values(array_filter(
                array_map(
                    static fn (mixed $phone): string => trim((string)$phone),
                    (array)($parsed['hp'] ?? [])
                ),
                static fn (string $phone): bool => $phone !== ''
            )),
        ];
    }

    protected function nextWriteNo(): int
    {
        $row = $this->fetchAssociative(
            "SELECT COALESCE(MAX(wr_no), 0) AS max_no FROM {$this->writeTable()}"
        );

        return (int)($row['max_no'] ?? 0) + 1;
    }

    protected function nextWriteRenum(int $writeNo): int
    {
        $row = $this->fetchAssociative(
            "SELECT COALESCE(MAX(wr_renum), 0) AS max_renum
             FROM {$this->writeTable()}
             WHERE wr_no = :wr_no",
            ['wr_no' => $writeNo]
        );

        return (int)($row['max_renum'] ?? 0) + 1;
    }
}
