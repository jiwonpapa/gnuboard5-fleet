<?php

/**
 * 관리자 SMS 발송 이력과 전송 결과를 공개 계약 타입으로 정규화합니다.
 *
 * @package  Api\Admin\Sms\Service\Support
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Admin\Sms\Service\Support;

final class AdminSmsMessagePresenter
{
    /** @param array<string, mixed> $row @return array<string, int|string|array<string, mixed>|null> */
    public static function batch(array $row): array
    {
        return [
            'wr_no' => (int)($row['wr_no'] ?? 0),
            'wr_renum' => (int)($row['wr_renum'] ?? 0),
            'wr_reply' => isset($row['wr_reply']) ? (string)$row['wr_reply'] : null,
            'wr_message' => isset($row['wr_message']) ? (string)$row['wr_message'] : null,
            'wr_booking' => isset($row['wr_booking']) ? (string)$row['wr_booking'] : null,
            'wr_total' => (int)($row['wr_total'] ?? 0),
            'wr_re_total' => (int)($row['wr_re_total'] ?? 0),
            'wr_success' => (int)($row['wr_success'] ?? 0),
            'wr_failure' => (int)($row['wr_failure'] ?? 0),
            'wr_datetime' => isset($row['wr_datetime']) ? (string)$row['wr_datetime'] : null,
            'wr_memo' => isset($row['wr_memo']) ? (string)$row['wr_memo'] : null,
            'duplicate_summary' => self::duplicateSummary($row['duplicate_summary'] ?? null),
        ];
    }

    /** @param array<string, mixed> $row @return array<string, int|string|null> */
    public static function retryBatch(array $row): array
    {
        return [
            'wr_no' => (int)($row['wr_no'] ?? 0),
            'wr_renum' => (int)($row['wr_renum'] ?? 0),
            'wr_total' => (int)($row['wr_total'] ?? 0),
            'wr_success' => (int)($row['wr_success'] ?? 0),
            'wr_failure' => (int)($row['wr_failure'] ?? 0),
            'wr_datetime' => isset($row['wr_datetime']) ? (string)$row['wr_datetime'] : null,
        ];
    }

    /** @param array<string, mixed> $row @return array<string, int|string|null> */
    public static function delivery(array $row): array
    {
        $result = ['hs_no' => (int)($row['hs_no'] ?? 0)];
        foreach (['wr_no', 'wr_renum', 'bg_no', 'bk_no', 'hs_flag'] as $field) {
            $result[$field] = isset($row[$field]) ? (int)$row[$field] : null;
        }
        foreach ([
            'bg_name', 'mb_id', 'hs_name', 'hs_hp', 'hs_datetime', 'hs_code', 'hs_memo',
            'hs_log', 'wr_message', 'wr_datetime', 'wr_booking',
        ] as $field) {
            $result[$field] = isset($row[$field]) ? (string)$row[$field] : null;
        }

        return $result;
    }

    /** @param array<string, mixed> $row @return array<string, int|string|bool|array<string, mixed>|null> */
    public static function sendResult(array $row): array
    {
        return [
            'write_no' => (int)($row['write_no'] ?? 0),
            'write_renum' => (int)($row['write_renum'] ?? 0),
            'reply' => isset($row['reply']) ? (string)$row['reply'] : null,
            'message' => isset($row['message']) ? (string)$row['message'] : null,
            'booking_at' => isset($row['booking_at']) ? (string)$row['booking_at'] : null,
            'total' => (int)($row['total'] ?? 0),
            'success' => (int)($row['success'] ?? 0),
            'failure' => (int)($row['failure'] ?? 0),
            'duplicate_summary' => self::duplicateSummary($row['duplicate_summary'] ?? null),
            'provider_ready' => (bool)($row['provider_ready'] ?? false),
        ];
    }

    /** @return array{total:int, phones:list<string>}|null */
    private static function duplicateSummary(mixed $value): ?array
    {
        if (!is_array($value)) {
            return null;
        }

        return [
            'total' => (int)($value['total'] ?? 0),
            'phones' => is_array($value['phones'] ?? null)
                ? array_values(array_map('strval', $value['phones']))
                : [],
        ];
    }
}
