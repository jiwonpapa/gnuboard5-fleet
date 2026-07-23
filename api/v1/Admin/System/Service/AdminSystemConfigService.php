<?php

/**
 * AdminSystemConfigService API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Service
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Service;

use Api\Admin\System\Repository\AdminSystemRepository;
use Api\Support\Exception\ApiException;

final class AdminSystemConfigService
{
    private const QA_STRING_FIELDS = [
        'qa_title',
        'qa_category',
        'qa_skin',
        'qa_mobile_skin',
        'qa_use_email',
        'qa_req_email',
        'qa_use_hp',
        'qa_req_hp',
        'qa_use_sms',
        'qa_send_number',
        'qa_admin_hp',
        'qa_admin_email',
        'qa_use_editor',
        'qa_subject_len',
        'qa_mobile_subject_len',
        'qa_page_rows',
        'qa_mobile_page_rows',
        'qa_image_width',
        'qa_upload_size',
        'qa_insert_content',
        'qa_include_head',
        'qa_include_tail',
        'qa_content_head',
        'qa_content_tail',
        'qa_mobile_content_head',
        'qa_mobile_content_tail',
        'qa_1_subj',
        'qa_2_subj',
        'qa_3_subj',
        'qa_4_subj',
        'qa_5_subj',
        'qa_1',
        'qa_2',
        'qa_3',
        'qa_4',
        'qa_5',
    ];

    public function __construct(private readonly AdminSystemRepository $repository)
    {
    }

    public function getQaConfig(): array
    {
        $defaults = array_fill_keys(self::QA_STRING_FIELDS, '');
        $defaults['qa_id'] = 1;
        $defaults['qa_title'] = '1:1 문의';
        $defaults['qa_skin'] = 'basic';
        $defaults['qa_mobile_skin'] = 'basic';

        $row = $this->repository->getQaConfig();
        if ($row === null) {
            return $defaults;
        }

        return array_replace($defaults, $this->normalizeQaConfig($row));
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function updateQaConfig(array $payload): array
    {
        if (array_diff(array_keys($payload), self::QA_STRING_FIELDS) !== []) {
            throw ApiException::badRequest('지원하지 않는 QA 설정 요청 필드가 포함되어 있습니다.');
        }

        $normalized = [];
        foreach (self::QA_STRING_FIELDS as $field) {
            if (array_key_exists($field, $payload)) {
                $normalized[$field] = is_scalar($payload[$field]) ? trim((string)$payload[$field]) : (string)$payload[$field];
            }
        }

        if ($normalized === []) {
            throw ApiException::badRequest('수정할 필드가 없습니다.');
        }

        $this->repository->updateQaConfig($normalized);

        return $this->getQaConfig();
    }

    public function getTheme(): array
    {
        return $this->repository->getThemeConfig();
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function updateTheme(array $payload): array
    {
        $theme = trim((string)($payload['cf_theme'] ?? ''));
        $mobileTheme = trim((string)($payload['cf_mobile_theme'] ?? ''));

        if ($theme === '' && $mobileTheme === '') {
            throw ApiException::badRequest('cf_theme 또는 cf_mobile_theme 중 하나는 필요합니다.');
        }

        if ($theme === '') {
            $theme = (string)($this->repository->getThemeConfig()['cf_theme'] ?? '');
        }
        if ($mobileTheme === '') {
            $mobileTheme = (string)($this->repository->getThemeConfig()['cf_mobile_theme'] ?? '');
        }

        $this->repository->updateThemeConfig($theme, $mobileTheme);

        return $this->getTheme();
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listMails(array $query): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(100, max(1, (int)($query['per_page'] ?? 20)));
        $result = $this->repository->listMailTemplates($page, $perPage);

        return [
            'items' => array_map(
                static fn (array $item): array => [
                    'ma_id' => (int)($item['ma_id'] ?? 0),
                    'ma_subject' => (string)($item['ma_subject'] ?? ''),
                    'ma_time' => (string)($item['ma_time'] ?? ''),
                    'ma_ip' => (string)($item['ma_ip'] ?? ''),
                    'ma_last_option' => (string)($item['ma_last_option'] ?? ''),
                ],
                $result['items']
            ),
            'pagination' => $this->buildPagination($page, $perPage, $result['total']),
        ];
    }

    /**
     * @param array<string, mixed> $query
     * @return array{items:array<int,array<string,mixed>>,pagination:array<string,mixed>}
     */
    public function listMailRecipients(array $query): array
    {
        $page = max(1, (int)($query['page'] ?? 1));
        $perPage = min(1000, max(1, (int)($query['per_page'] ?? 50)));
        $search = isset($query['search']) ? trim((string)$query['search']) : null;
        $result = $this->repository->listMailRecipients($page, $perPage, $search);

        return [
            'items' => array_map(
                static fn (array $item): array => [
                    'mb_id' => (string)($item['mb_id'] ?? ''),
                    'mb_name' => (string)($item['mb_name'] ?? ''),
                    'mb_nick' => (string)($item['mb_nick'] ?? ''),
                    'mb_email' => (string)($item['mb_email'] ?? ''),
                    'mb_level' => (int)($item['mb_level'] ?? 0),
                    'mb_mailling' => (int)($item['mb_mailling'] ?? 0),
                    'mb_today_login' => (string)($item['mb_today_login'] ?? ''),
                ],
                $result['items']
            ),
            'pagination' => $this->buildPagination($page, $perPage, $result['total']),
        ];
    }

    /**
     * @return array<string, int|bool>
     */
    private function buildPagination(int $page, int $perPage, int $total): array
    {
        $lastPage = max(1, (int)ceil($total / $perPage));

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => $lastPage,
            'has_next' => $page < $lastPage,
            'has_prev' => $page > 1,
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, int|string>
     */
    private function normalizeQaConfig(array $row): array
    {
        $normalized = [];
        if (array_key_exists('qa_id', $row)) {
            $normalized['qa_id'] = (int)$row['qa_id'];
        }
        foreach (self::QA_STRING_FIELDS as $field) {
            if (array_key_exists($field, $row)) {
                $normalized[$field] = (string)$row[$field];
            }
        }

        return $normalized;
    }
}
