<?php

/**
 * AdminSystemConfigRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Admin\System\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Admin\System\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminSystemConfigRepository extends AdminBaseRepository
{
    private const QA_FIELDS = [
        'qa_title', 'qa_category', 'qa_skin', 'qa_mobile_skin',
        'qa_use_email', 'qa_req_email', 'qa_use_hp', 'qa_req_hp', 'qa_use_sms',
        'qa_send_number', 'qa_admin_hp', 'qa_admin_email', 'qa_use_editor',
        'qa_subject_len', 'qa_mobile_subject_len', 'qa_page_rows', 'qa_mobile_page_rows',
        'qa_image_width', 'qa_upload_size', 'qa_insert_content', 'qa_include_head',
        'qa_include_tail', 'qa_content_head', 'qa_content_tail', 'qa_mobile_content_head',
        'qa_mobile_content_tail', 'qa_1_subj', 'qa_2_subj', 'qa_3_subj', 'qa_4_subj',
        'qa_5_subj', 'qa_1', 'qa_2', 'qa_3', 'qa_4', 'qa_5',
    ];

    public function getQaConfig(): ?array
    {
        $table = $this->tables()->get('qa_config');
        $row = $this->fetchAssociative(
            "SELECT * FROM {$table} ORDER BY qa_id ASC LIMIT 1"
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function updateQaConfig(array $payload): int
    {
        $table = $this->tables()->get('qa_config');
        $payload = array_intersect_key($payload, array_flip(self::QA_FIELDS));
        $existing = $this->getQaConfig();
        if ($existing === null) {
            $payload = array_replace([
                'qa_title' => '1:1 문의',
                'qa_category' => '',
                'qa_skin' => 'basic',
                'qa_mobile_skin' => 'basic',
            ], $payload);
            $columns = ['qa_id', ...array_keys($payload)];
            $params = ['qa_id' => 1, ...$payload];

            return $this->executeStatement(
                "INSERT INTO {$table} (" . implode(', ', $columns) . ')
                 VALUES (:' . implode(', :', $columns) . ')',
                $params
            );
        }

        $sets = [];
        $params = ['qa_id' => (int)($existing['qa_id'] ?? 1)];
        foreach ($payload as $field => $value) {
            $param = 'u_' . $field;
            $sets[] = "{$field} = :{$param}";
            $params[$param] = $value;
        }

        if ($sets === []) {
            return 0;
        }

        return $this->executeStatement(
            "UPDATE {$table}
             SET " . implode(', ', $sets) . "
             WHERE qa_id = :qa_id",
            $params
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function getThemeConfig(): array
    {
        $table = $this->tables()->get('config');
        $hasMobileThemeColumn = $this->columnExists($table, 'cf_mobile_theme');
        $row = $this->fetchAssociative(
            $hasMobileThemeColumn
                ? "SELECT cf_theme, cf_mobile_theme
                   FROM {$table}
                   LIMIT 1"
                : "SELECT cf_theme, '' AS cf_mobile_theme
                   FROM {$table}
                   LIMIT 1"
        );

        return is_array($row) ? $row : ['cf_theme' => '', 'cf_mobile_theme' => ''];
    }

    public function updateThemeConfig(string $theme, string $mobileTheme): int
    {
        $table = $this->tables()->get('config');
        $hasMobileThemeColumn = $this->columnExists($table, 'cf_mobile_theme');

        return $this->executeStatement(
            $hasMobileThemeColumn
                ? "UPDATE {$table}
                   SET cf_theme = :cf_theme,
                       cf_mobile_theme = :cf_mobile_theme"
                : "UPDATE {$table}
                   SET cf_theme = :cf_theme",
            $hasMobileThemeColumn
                ? [
                    'cf_theme' => $theme,
                    'cf_mobile_theme' => $mobileTheme,
                ]
                : [
                    'cf_theme' => $theme,
                ]
        );
    }
}
