<?php

/**
 * 관리자 포인트 조회·만료 응답을 공개 계약 필드와 타입으로 정규화합니다.
 *
 * @package  Gnuboard5\Api\v1\Admin\Point\Service\Support
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Admin\Point\Service\Support;

final class AdminPointPresenter
{
    /**
     * @param array<string, mixed> $row
     * @return array<string, int|string>
     */
    public static function item(array $row): array
    {
        return [
            'po_id' => (int)($row['po_id'] ?? 0),
            'mb_id' => (string)($row['mb_id'] ?? ''),
            'po_datetime' => (string)($row['po_datetime'] ?? ''),
            'po_content' => (string)($row['po_content'] ?? ''),
            'po_point' => (int)($row['po_point'] ?? 0),
            'po_use_point' => (int)($row['po_use_point'] ?? 0),
            'po_expired' => (int)($row['po_expired'] ?? 0),
            'po_expire_date' => (string)($row['po_expire_date'] ?? ''),
            'po_mb_point' => (int)($row['po_mb_point'] ?? 0),
            'po_rel_table' => (string)($row['po_rel_table'] ?? ''),
            'po_rel_id' => (string)($row['po_rel_id'] ?? ''),
            'po_rel_action' => (string)($row['po_rel_action'] ?? ''),
        ];
    }

    /**
     * @param array<string, mixed> $summary
     * @return array<string, int|string>
     */
    public static function summary(array $summary): array
    {
        $result = [
            'total_point' => (int)($summary['total_point'] ?? 0),
            'total_rows' => (int)($summary['total_rows'] ?? 0),
        ];
        if (array_key_exists('mb_id', $summary)) {
            $result['mb_id'] = (string)$summary['mb_id'];
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $result
     * @return array{base_date:string,expired_count:int,synced_members:int}
     */
    public static function expiration(array $result): array
    {
        return [
            'base_date' => (string)($result['base_date'] ?? ''),
            'expired_count' => (int)($result['expired_count'] ?? 0),
            'synced_members' => (int)($result['synced_members'] ?? 0),
        ];
    }
}
