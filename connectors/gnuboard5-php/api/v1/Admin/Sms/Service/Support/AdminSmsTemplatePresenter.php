<?php

/**
 * 관리자 SMS 템플릿과 그룹 응답을 공개 계약 타입으로 정규화합니다.
 *
 * @package  Api\Admin\Sms\Service\Support
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Admin\Sms\Service\Support;

final class AdminSmsTemplatePresenter
{
    /** @param array<string, mixed> $row @return array<string, int|string|bool> */
    public static function group(array $row): array
    {
        return [
            'fg_no' => (int)($row['fg_no'] ?? 0),
            'fg_name' => (string)($row['fg_name'] ?? ''),
            'fg_count' => (int)($row['fg_count'] ?? 0),
            'fg_member' => (int)($row['fg_member'] ?? 0),
            'is_virtual' => (bool)($row['is_virtual'] ?? false),
        ];
    }

    /** @param array<string, mixed> $row @return array<string, int|string|null> */
    public static function template(array $row): array
    {
        return [
            'fo_no' => (int)($row['fo_no'] ?? 0),
            'fg_no' => (int)($row['fg_no'] ?? 0),
            'fg_member' => (int)($row['fg_member'] ?? 0),
            'fg_name' => isset($row['fg_name']) ? (string)$row['fg_name'] : null,
            'fo_name' => (string)($row['fo_name'] ?? ''),
            'fo_content' => (string)($row['fo_content'] ?? ''),
            'fo_datetime' => isset($row['fo_datetime']) ? (string)$row['fo_datetime'] : null,
        ];
    }

    /** @param array<string, mixed> $row @return array{action:string, affected:int, target_fg_no:int|null} */
    public static function batchResult(array $row): array
    {
        return [
            'action' => (string)($row['action'] ?? ''),
            'affected' => (int)($row['affected'] ?? 0),
            'target_fg_no' => isset($row['target_fg_no']) ? (int)$row['target_fg_no'] : null,
        ];
    }
}
