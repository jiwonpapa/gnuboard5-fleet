<?php

/**
 * 관리자 SMS 연락처·그룹·가져오기 응답을 공개 계약 타입으로 정규화합니다.
 *
 * @package  Api\Admin\Sms\Service\Support
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Admin\Sms\Service\Support;

final class AdminSmsContactPresenter
{
    /** @param array<string, mixed> $row @return array<string, int|string> */
    public static function group(array $row): array
    {
        return [
            'bg_no' => (int)($row['bg_no'] ?? 0),
            'bg_name' => (string)($row['bg_name'] ?? ''),
            'bg_count' => (int)($row['bg_count'] ?? 0),
            'bg_member' => (int)($row['bg_member'] ?? 0),
            'bg_nomember' => (int)($row['bg_nomember'] ?? 0),
            'bg_receipt' => (int)($row['bg_receipt'] ?? 0),
            'bg_reject' => (int)($row['bg_reject'] ?? 0),
        ];
    }

    /** @param array<string, mixed> $row @return array<string, int|string|bool|null> */
    public static function contact(array $row): array
    {
        $memberId = isset($row['mb_id']) ? trim((string)$row['mb_id']) : '';
        $receipt = (int)($row['bk_receipt'] ?? 0);

        return [
            'bk_no' => (int)($row['bk_no'] ?? 0),
            'bg_no' => (int)($row['bg_no'] ?? 0),
            'bg_name' => isset($row['bg_name']) ? (string)$row['bg_name'] : null,
            'mb_id' => $memberId !== '' ? $memberId : null,
            'bk_name' => (string)($row['bk_name'] ?? ''),
            'bk_hp' => (string)($row['bk_hp'] ?? ''),
            'bk_receipt' => $receipt,
            'bk_datetime' => isset($row['bk_datetime']) ? (string)$row['bk_datetime'] : null,
            'bk_memo' => isset($row['bk_memo']) ? (string)$row['bk_memo'] : null,
            'receipt_label' => (string)($row['receipt_label'] ?? ($receipt === 1 ? '수신' : '거부')),
            'member_type' => (string)($row['member_type'] ?? ($memberId === '' ? 'non_member' : 'member')),
            'member_sync_skipped' => array_key_exists('member_sync_skipped', $row)
                ? (bool)$row['member_sync_skipped']
                : null,
        ];
    }

    /** @param array<string, mixed> $row @return array<string, int|string|null> */
    public static function summary(array $row): array
    {
        return [
            'total_count' => (int)($row['total_count'] ?? 0),
            'receipt_count' => (int)($row['receipt_count'] ?? 0),
            'reject_count' => (int)($row['reject_count'] ?? 0),
            'member_count' => (int)($row['member_count'] ?? 0),
            'non_member_count' => (int)($row['non_member_count'] ?? 0),
            'last_synced_at' => isset($row['last_synced_at']) ? (string)$row['last_synced_at'] : null,
        ];
    }

    /** @param array<string, mixed> $row @return array{action:string, affected:int, target_bg_no:int|null} */
    public static function batchResult(array $row): array
    {
        return [
            'action' => (string)($row['action'] ?? ''),
            'affected' => (int)($row['affected'] ?? 0),
            'target_bg_no' => isset($row['target_bg_no']) ? (int)$row['target_bg_no'] : null,
        ];
    }

    /** @param array<string, mixed> $row @return array<string, int|string|bool|array<int, string>> */
    public static function importResult(array $row): array
    {
        return [
            'total_count' => (int)($row['total_count'] ?? 0),
            'invalid_count' => (int)($row['invalid_count'] ?? 0),
            'duplicate_count' => (int)($row['duplicate_count'] ?? 0),
            'importable_count' => (int)($row['importable_count'] ?? 0),
            'imported_count' => (int)($row['imported_count'] ?? 0),
            'dry_run' => (bool)($row['dry_run'] ?? false),
            'duplicate_phones' => self::strings($row['duplicate_phones'] ?? []),
            'importable_phones' => self::strings($row['importable_phones'] ?? []),
        ];
    }

    /** @param array<string, mixed> $row @return array<string, int|string|null> */
    public static function exportItem(array $row): array
    {
        $memberId = isset($row['mb_id']) ? trim((string)$row['mb_id']) : '';

        return [
            'bk_name' => (string)($row['bk_name'] ?? ''),
            'bk_hp' => (string)($row['bk_hp'] ?? ''),
            'bg_no' => (int)($row['bg_no'] ?? 0),
            'mb_id' => $memberId !== '' ? $memberId : null,
            'bk_receipt' => (int)($row['bk_receipt'] ?? 0),
        ];
    }

    /** @return list<string> */
    private static function strings(mixed $values): array
    {
        if (!is_array($values)) {
            return [];
        }

        return array_values(array_map('strval', $values));
    }
}
