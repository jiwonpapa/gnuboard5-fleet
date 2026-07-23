<?php

declare(strict_types=1);

namespace Api\Admin\Report\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminReportSchemaRepository extends AdminBaseRepository
{
    /** @var array<string, true>|null */
    private ?array $reportColumns = null;

    public function reportSelectColumns(): string
    {
        $columns = [
            'rp_id',
            'mb_id',
            'rp_target_type',
            'rp_target_id',
            'rp_reason',
            'rp_detail',
            'rp_status',
            $this->hasReportColumn('rp_admin_memo') ? 'rp_admin_memo' : "'' AS rp_admin_memo",
            'rp_datetime',
            $this->hasReportColumn('rp_processed_at') ? 'rp_processed_at' : 'NULL AS rp_processed_at',
        ];

        return implode(', ', $columns);
    }

    public function hasReportColumn(string $column): bool
    {
        return isset($this->reportColumns()[$column]);
    }

    /**
     * @return array<string, true>
     */
    private function reportColumns(): array
    {
        if (is_array($this->reportColumns)) {
            return $this->reportColumns;
        }

        $table = $this->tables()->get('report');
        $rows = $this->fetchAllAssociative(
            'SELECT COLUMN_NAME
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :table_name',
            ['table_name' => $table]
        );

        $columns = [];
        foreach ($rows as $row) {
            $name = trim((string)($row['COLUMN_NAME'] ?? ''));
            if ($name === '') {
                continue;
            }

            $columns[$name] = true;
        }

        return $this->reportColumns = $columns;
    }
}
