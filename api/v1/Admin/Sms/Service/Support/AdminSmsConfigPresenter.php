<?php

/**
 * 관리자 SMS 설정 및 회원 동기화 응답을 공개 계약 타입으로 정규화합니다.
 *
 * @package  Api\Admin\Sms\Service\Support
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Admin\Sms\Service\Support;

final class AdminSmsConfigPresenter
{
    /** @param array<string, mixed> $row @return array<string, string|bool|array<int, string>|null> */
    public static function config(array $row): array
    {
        $result = [];
        foreach ([
            'cf_title', 'cf_sms_use', 'cf_sms_type', 'cf_icode_id', 'cf_icode_pw',
            'cf_icode_server_ip', 'cf_icode_server_port', 'cf_icode_token_key',
            'cf_phone', 'cf_datetime',
        ] as $field) {
            $result[$field] = isset($row[$field]) ? (string)$row[$field] : null;
        }
        $result['provider_ready'] = (bool)($row['provider_ready'] ?? false);
        $result['uses_token_key'] = (bool)($row['uses_token_key'] ?? false);
        $result['uses_legacy_credentials'] = (bool)($row['uses_legacy_credentials'] ?? false);
        $result['storage_ready'] = (bool)($row['storage_ready'] ?? false);
        $result['missing_tables'] = is_array($row['missing_tables'] ?? null)
            ? array_values(array_map('strval', $row['missing_tables']))
            : [];

        return $result;
    }

    /** @param array<string, mixed> $row @return array<string, string|array<string, int>|null> */
    public static function memberSync(array $row): array
    {
        $summary = is_array($row['summary'] ?? null) ? $row['summary'] : [];

        return [
            'datetime' => isset($row['datetime']) ? (string)$row['datetime'] : null,
            'summary' => [
                'total_members' => (int)($summary['total_members'] ?? 0),
                'leave_members' => (int)($summary['leave_members'] ?? 0),
                'phone_empty' => (int)($summary['phone_empty'] ?? 0),
                'phone_valid' => (int)($summary['phone_valid'] ?? 0),
                'phone_invalid' => (int)($summary['phone_invalid'] ?? 0),
                'receipt_enabled' => (int)($summary['receipt_enabled'] ?? 0),
                'receipt_disabled' => (int)($summary['receipt_disabled'] ?? 0),
            ],
        ];
    }
}
