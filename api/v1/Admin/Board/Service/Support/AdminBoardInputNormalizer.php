<?php

declare(strict_types=1);

namespace Api\Admin\Board\Service\Support;

use Api\Support\Exception\ApiException;
use Api\Support\Validation\ValidationPatterns;

final class AdminBoardInputNormalizer
{
    private const STRING_FIELDS = [
        'bo_subject',
        'gr_id',
        'bo_mobile_subject',
        'bo_device',
        'bo_category_list',
        'bo_admin',
        'bo_select_editor',
        'bo_use_cert',
        'bo_skin',
        'bo_mobile_skin',
        'bo_include_head',
        'bo_include_tail',
        'bo_content_head',
        'bo_mobile_content_head',
        'bo_content_tail',
        'bo_mobile_content_tail',
        'bo_insert_content',
        'bo_sort_field',
        'bo_1_subj',
        'bo_2_subj',
        'bo_3_subj',
        'bo_4_subj',
        'bo_5_subj',
        'bo_6_subj',
        'bo_7_subj',
        'bo_8_subj',
        'bo_9_subj',
        'bo_10_subj',
        'bo_1',
        'bo_2',
        'bo_3',
        'bo_4',
        'bo_5',
        'bo_6',
        'bo_7',
        'bo_8',
        'bo_9',
        'bo_10',
    ];

    private const INTEGER_FIELDS = [
        'bo_list_level',
        'bo_read_level',
        'bo_write_level',
        'bo_reply_level',
        'bo_comment_level',
        'bo_upload_level',
        'bo_download_level',
        'bo_html_level',
        'bo_link_level',
        'bo_count_delete',
        'bo_count_modify',
        'bo_use_secret',
        'bo_upload_size',
        'bo_order',
        'bo_write_min',
        'bo_write_max',
        'bo_comment_min',
        'bo_comment_max',
        'bo_upload_count',
        'bo_read_point',
        'bo_write_point',
        'bo_comment_point',
        'bo_download_point',
        'bo_table_width',
        'bo_subject_len',
        'bo_mobile_subject_len',
        'bo_page_rows',
        'bo_mobile_page_rows',
        'bo_new',
        'bo_hot',
        'bo_image_width',
        'bo_gallery_cols',
        'bo_gallery_width',
        'bo_gallery_height',
        'bo_mobile_gallery_width',
        'bo_mobile_gallery_height',
        'bo_reply_order',
    ];

    private const BOOLEAN_FIELDS = [
        'bo_use_category',
        'bo_use_sideview',
        'bo_use_file_content',
        'bo_use_dhtml_editor',
        'bo_use_rss_view',
        'bo_use_good',
        'bo_use_nogood',
        'bo_use_name',
        'bo_use_signature',
        'bo_use_ip_view',
        'bo_use_list_view',
        'bo_use_list_file',
        'bo_use_list_content',
        'bo_use_search',
        'bo_use_email',
        'bo_use_sns',
        'bo_use_captcha',
    ];

    /**
     * @param array<string, mixed> $query
     * @return array{page:int, per_page:int, sort_by:string, sort_direction:string, gr_id:?string, search:?string}
     */
    public function normalizeListQuery(array $query): array
    {
        $sortDirection = strtoupper(trim((string)($query['sort_direction'] ?? 'ASC')));
        if (!in_array($sortDirection, ['ASC', 'DESC'], true)) {
            $sortDirection = 'ASC';
        }

        return [
            'page' => max(1, (int)($query['page'] ?? 1)),
            'per_page' => min(100, max(1, (int)($query['per_page'] ?? 20))),
            'sort_by' => trim((string)($query['sort_by'] ?? 'bo_table')),
            'sort_direction' => $sortDirection,
            'gr_id' => $this->normalizeNullableGroupId($query['gr_id'] ?? null),
            'search' => isset($query['search']) ? (string)$query['search'] : null,
        ];
    }

    public function normalizeBoardTable(string $boTable): string
    {
        $value = trim($boTable);
        if ($value === '' || preg_match('/^[a-zA-Z0-9_]{1,20}$/', $value) !== 1) {
            throw ApiException::badRequest('bo_table 형식이 올바르지 않습니다.');
        }

        return $value;
    }

    public function requireSubject(mixed $value): string
    {
        $subject = trim((string)$value);
        if ($subject === '') {
            throw ApiException::badRequest('bo_subject는 필수입니다.');
        }

        return $subject;
    }

    public function requireGroupId(mixed $value): string
    {
        $groupId = trim((string)$value);
        if ($groupId === '') {
            throw ApiException::badRequest('gr_id는 필수입니다.');
        }
        if (preg_match(ValidationPatterns::GROUP_ID, $groupId) !== 1) {
            throw ApiException::badRequest('gr_id 형식이 올바르지 않습니다.');
        }

        return $groupId;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function normalizeCreatePayload(array $payload): array
    {
        $this->assertAllowedKeys($payload, [
            'bo_table',
            'bo_count_write',
            'bo_count_comment',
            ...self::STRING_FIELDS,
            ...self::INTEGER_FIELDS,
            ...self::BOOLEAN_FIELDS,
        ]);

        $normalized = $this->normalizeMutablePayload($payload);
        $normalized['bo_table'] = $this->normalizeBoardTable((string)($payload['bo_table'] ?? ''));
        $normalized['bo_subject'] = $this->requireSubject($payload['bo_subject'] ?? null);
        $normalized['gr_id'] = $this->requireGroupId($payload['gr_id'] ?? null);
        foreach (['bo_count_write', 'bo_count_comment'] as $field) {
            if (array_key_exists($field, $payload)) {
                $normalized[$field] = $this->normalizeInteger($payload[$field], $field);
            }
        }

        return $normalized;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function normalizeUpdatePayload(array $payload): array
    {
        $this->assertAllowedKeys($payload, [
            ...self::STRING_FIELDS,
            ...self::INTEGER_FIELDS,
            ...self::BOOLEAN_FIELDS,
        ]);
        if ($payload === []) {
            throw ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $normalized = $this->normalizeMutablePayload($payload);
        if (array_key_exists('bo_subject', $normalized)) {
            $normalized['bo_subject'] = $this->requireSubject($normalized['bo_subject']);
        }
        if (array_key_exists('gr_id', $normalized)) {
            $normalized['gr_id'] = $this->requireGroupId($normalized['gr_id']);
        }

        return $normalized;
    }

    /** @param array<string,mixed> $board @return array<string,mixed> */
    public function normalizeBoardRecord(array $board): array
    {
        $normalized = [];
        foreach (['bo_table', 'bo_notice', ...self::STRING_FIELDS] as $field) {
            if (array_key_exists($field, $board)) {
                $normalized[$field] = (string)$board[$field];
            }
        }
        foreach (['bo_count_write', 'bo_count_comment', ...self::INTEGER_FIELDS] as $field) {
            if (array_key_exists($field, $board)) {
                $normalized[$field] = (int)$board[$field];
            }
        }
        foreach (self::BOOLEAN_FIELDS as $field) {
            if (array_key_exists($field, $board)) {
                $normalized[$field] = $this->normalizeBoolean($board[$field], $field) === 1;
            }
        }

        return $normalized;
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $sourceBoard
     * @return array{target_bo_table:string,target_bo_subject:string,copy_posts:bool}
     */
    public function normalizeCopyTarget(array $payload, array $sourceBoard): array
    {
        $this->assertAllowedKeys($payload, ['target_bo_table', 'target_bo_subject', 'copy_posts']);
        $target = $this->normalizeBoardTable((string)($payload['target_bo_table'] ?? ''));
        $targetSubjectValue = $payload['target_bo_subject'] ?? '';
        if (!is_string($targetSubjectValue)) {
            throw ApiException::badRequest('target_bo_subject는 문자열이어야 합니다.');
        }
        $targetSubject = trim($targetSubjectValue);
        if ($targetSubject === '') {
            $targetSubject = (string)($sourceBoard['bo_subject'] ?? '') . ' (복사)';
        }

        $copyPostsValue = $payload['copy_posts'] ?? false;
        $copyPosts = $this->normalizeBoolean($copyPostsValue, 'copy_posts') === 1;

        return [
            'target_bo_table' => $target,
            'target_bo_subject' => $targetSubject,
            'copy_posts' => $copyPosts,
        ];
    }

    /** @param array<string,mixed> $payload @return array<string,mixed> */
    private function normalizeMutablePayload(array $payload): array
    {
        $normalized = [];
        foreach (self::STRING_FIELDS as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }
            if (!is_string($payload[$field])) {
                throw ApiException::badRequest($field . ' 값은 문자열이어야 합니다.');
            }
            $normalized[$field] = $payload[$field];
        }
        foreach (self::INTEGER_FIELDS as $field) {
            if (array_key_exists($field, $payload)) {
                $normalized[$field] = $this->normalizeInteger($payload[$field], $field);
            }
        }
        foreach (self::BOOLEAN_FIELDS as $field) {
            if (array_key_exists($field, $payload)) {
                $normalized[$field] = $this->normalizeBoolean($payload[$field], $field);
            }
        }

        if (array_key_exists('bo_device', $normalized)) {
            $device = strtolower(trim((string)$normalized['bo_device']));
            if (!in_array($device, ['both', 'pc', 'mobile'], true)) {
                throw ApiException::badRequest('bo_device 값이 올바르지 않습니다.');
            }
            $normalized['bo_device'] = $device;
        }
        if (array_key_exists('bo_use_cert', $normalized)) {
            $cert = trim((string)$normalized['bo_use_cert']);
            if (!in_array($cert, ['', 'cert', 'adult'], true)) {
                throw ApiException::badRequest('bo_use_cert 값이 올바르지 않습니다.');
            }
            $normalized['bo_use_cert'] = $cert;
        }
        if (
            array_key_exists('bo_reply_order', $normalized)
            && !in_array($normalized['bo_reply_order'], [0, 1], true)
        ) {
            throw ApiException::badRequest('bo_reply_order 값이 올바르지 않습니다.');
        }

        return $normalized;
    }

    private function normalizeInteger(mixed $value, string $field): int
    {
        if (is_int($value)) {
            return $value;
        }
        if (is_string($value) && preg_match('/^-?\d+$/', trim($value)) === 1) {
            return (int)$value;
        }

        throw ApiException::badRequest($field . ' 값은 정수여야 합니다.');
    }

    private function normalizeBoolean(mixed $value, string $field): int
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if (is_int($value) && in_array($value, [0, 1], true)) {
            return $value;
        }
        if (is_string($value)) {
            $normalized = strtolower(trim($value));
            if (in_array($normalized, ['1', 'true'], true)) {
                return 1;
            }
            if (in_array($normalized, ['0', 'false'], true)) {
                return 0;
            }
        }

        throw ApiException::badRequest($field . ' 값은 boolean이어야 합니다.');
    }

    /** @param array<string,mixed> $payload @param list<string> $allowed */
    private function assertAllowedKeys(array $payload, array $allowed): void
    {
        $unknown = array_values(array_diff(array_keys($payload), $allowed));
        if ($unknown !== []) {
            throw ApiException::badRequest('지원하지 않는 게시판 요청 필드가 포함되어 있습니다: ' . implode(', ', $unknown));
        }
    }

    private function normalizeNullableGroupId(mixed $groupId): ?string
    {
        if ($groupId === null) {
            return null;
        }

        $value = trim((string)$groupId);
        if ($value === '') {
            return null;
        }

        if (preg_match(ValidationPatterns::GROUP_ID, $value) !== 1) {
            throw ApiException::badRequest('gr_id 형식이 올바르지 않습니다.');
        }

        return $value;
    }
}
