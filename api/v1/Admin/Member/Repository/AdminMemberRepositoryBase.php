<?php

declare(strict_types=1);

namespace Api\Admin\Member\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

abstract class AdminMemberRepositoryBase extends AdminBaseRepository
{
    protected function memberTable(): string
    {
        return $this->tables()->get('member');
    }

    protected function configTable(): string
    {
        return $this->tables()->get('config');
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    protected function normalizeMemberRow(array $row): array
    {
        $zip1 = $this->normalizeZipSegment((string)($row['mb_zip1'] ?? ''));
        $zip2 = $this->normalizeZipSegment((string)($row['mb_zip2'] ?? ''));
        $row['mb_zip1'] = $zip1;
        $row['mb_zip2'] = $zip2;
        $row['mb_zip'] = $zip1 . $zip2;

        return $row;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    protected function normalizeZipPayload(array $payload): array
    {
        if (array_key_exists('mb_zip', $payload)) {
            [$zip1, $zip2] = $this->splitZip((string)$payload['mb_zip']);
            $payload['mb_zip1'] = $zip1;
            $payload['mb_zip2'] = $zip2;
            unset($payload['mb_zip']);
        }

        if (array_key_exists('mb_zip1', $payload)) {
            $payload['mb_zip1'] = $this->normalizeZipSegment((string)$payload['mb_zip1']);
        }

        if (array_key_exists('mb_zip2', $payload)) {
            $payload['mb_zip2'] = $this->normalizeZipSegment((string)$payload['mb_zip2']);
        }

        return $payload;
    }

    /**
     * @return array{0:string,1:string}
     */
    protected function splitZip(string $value): array
    {
        $digits = preg_replace('/[^0-9]/', '', $value) ?? '';
        if ($digits === '') {
            return ['', ''];
        }

        return [
            $this->normalizeZipSegment(substr($digits, 0, 3)),
            $this->normalizeZipSegment(substr($digits, 3, 3)),
        ];
    }

    protected function normalizeZipSegment(string $value): string
    {
        $digits = preg_replace('/[^0-9]/', '', $value) ?? '';

        return substr($digits, 0, 3);
    }
}
