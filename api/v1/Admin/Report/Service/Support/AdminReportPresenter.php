<?php

declare(strict_types=1);

namespace Api\Admin\Report\Service\Support;

final class AdminReportPresenter
{
    /** @param array<string,mixed> $row @return array<string,mixed> */
    public function item(array $row): array
    {
        return [
            'rp_id' => (int)($row['rp_id'] ?? 0),
            'mb_id' => $this->nullableString($row['mb_id'] ?? null),
            'rp_target_type' => $this->nullableString($row['rp_target_type'] ?? null),
            'rp_target_id' => $this->nullableString($row['rp_target_id'] ?? null),
            'rp_reason' => $this->nullableString($row['rp_reason'] ?? null),
            'rp_detail' => $this->nullableString($row['rp_detail'] ?? null),
            'rp_status' => $this->nullableString($row['rp_status'] ?? null),
            'rp_admin_memo' => $this->nullableString($row['rp_admin_memo'] ?? null),
            'rp_datetime' => $this->nullableString($row['rp_datetime'] ?? null),
            'rp_processed_at' => $this->nullableString($row['rp_processed_at'] ?? null),
        ];
    }

    private function nullableString(mixed $value): ?string
    {
        return $value === null ? null : (string)$value;
    }
}
