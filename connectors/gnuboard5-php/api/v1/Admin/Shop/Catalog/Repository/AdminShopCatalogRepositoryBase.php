<?php

declare(strict_types=1);

namespace Api\Admin\Shop\Catalog\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

/**
 * Catalog repository 공통 유틸리티.
 *
 * @package  Api\Admin\Shop\Catalog\Repository
 * @since    v1.0.0
 */
abstract class AdminShopCatalogRepositoryBase extends AdminBaseRepository
{
    protected const CATEGORY_ID = 'ca_id';
    protected const PRODUCT_ID = 'it_id';
    protected const OPTION_ID = 'io_no';
    protected const REVIEW_ID = 'is_id';
    protected const INQUIRY_ID = 'iq_id';
    protected const EVENT_ID = 'ev_id';
    protected const STOCK_SMS_ID = 'ss_id';

    /** @var array<string, array<string,bool>> */
    private array $tableColumns = [];

    protected function shopTable(string $suffix): string
    {
        return $this->tables()->prefix() . 'shop_' . $suffix;
    }

    /**
     * @param list<string> $exclude
     * @param list<string>|null $include
     * @return array<string,mixed>
     */
    protected function filterPayload(string $table, array $payload, array $exclude = [], ?array $include = null): array
    {
        $columns = $this->tableColumns($table);
        if ($columns === []) {
            return [];
        }

        $result = [];
        foreach ($payload as $field => $value) {
            if (!is_string($field)) {
                continue;
            }

            if (in_array($field, $exclude, true)) {
                continue;
            }

            if (!array_key_exists($field, $columns)) {
                continue;
            }

            if ($include !== null && !in_array($field, $include, true)) {
                continue;
            }

            $result[$field] = $value;
        }

        return $result;
    }

    /**
     * @return array<string,bool>
     */
    protected function tableColumns(string $table): array
    {
        if (array_key_exists($table, $this->tableColumns)) {
            return $this->tableColumns[$table];
        }

        $columns = [];
        $rows = $this->fetchAllAssociative(
            'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name',
            ['table_name' => $table]
        );

        foreach ($rows as $row) {
            if (is_array($row) && array_key_exists('COLUMN_NAME', $row) && is_string($row['COLUMN_NAME'])) {
                $columns[$row['COLUMN_NAME']] = true;
            }
        }

        $this->tableColumns[$table] = $columns;

        return $columns;
    }
}
