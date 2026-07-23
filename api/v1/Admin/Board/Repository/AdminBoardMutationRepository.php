<?php

declare(strict_types=1);

namespace Api\Admin\Board\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminBoardMutationRepository extends AdminBaseRepository
{
    private const UPDATABLE_FIELDS = [
        'bo_subject',
        'gr_id',
        'bo_admin',
        'bo_device',
        'bo_list_level',
        'bo_read_level',
        'bo_write_level',
        'bo_reply_level',
        'bo_comment_level',
        'bo_upload_level',
        'bo_download_level',
        'bo_html_level',
        'bo_link_level',
        'bo_use_category',
        'bo_category_list',
        'bo_write_point',
        'bo_comment_point',
        'bo_read_point',
        'bo_download_point',
        'bo_gallery_cols',
        'bo_gallery_width',
        'bo_gallery_height',
        'bo_mobile_gallery_width',
        'bo_mobile_gallery_height',
        'bo_image_width',
        'bo_page_rows',
        'bo_mobile_page_rows',
        'bo_subject_len',
        'bo_mobile_subject_len',
        'bo_table_width',
        'bo_mobile_subject',
        'bo_write_min',
        'bo_write_max',
        'bo_comment_min',
        'bo_comment_max',
        'bo_count_delete',
        'bo_count_modify',
        'bo_hot',
        'bo_new',
        'bo_order',
        'bo_use_captcha',
        'bo_use_cert',
        'bo_use_dhtml_editor',
        'bo_use_email',
        'bo_use_file_content',
        'bo_use_good',
        'bo_use_nogood',
        'bo_use_ip_view',
        'bo_use_list_content',
        'bo_use_list_file',
        'bo_use_list_view',
        'bo_use_name',
        'bo_use_rss_view',
        'bo_use_search',
        'bo_use_sideview',
        'bo_use_signature',
        'bo_use_sns',
        'bo_include_head',
        'bo_include_tail',
        'bo_content_head',
        'bo_mobile_content_head',
        'bo_content_tail',
        'bo_mobile_content_tail',
        'bo_insert_content',
        'bo_sort_field',
        'bo_reply_order',
        'bo_select_editor',
        'bo_use_secret',
        'bo_upload_count',
        'bo_upload_size',
        'bo_skin',
        'bo_mobile_skin',
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

    private ?AdminBoardMutationPayloadBuilder $resolvedPayloadBuilder = null;
    private ?AdminBoardCopyStore $resolvedCopyStore = null;

    /**
     * @param list<string>|null $updatableFields
     */
    public function __construct(
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null,
        private readonly ?array $updatableFields = null,
        ?AdminBoardMutationPayloadBuilder $payloadBuilder = null,
        ?AdminBoardCopyStore $copyStore = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedPayloadBuilder = $payloadBuilder;
        $this->resolvedCopyStore = $copyStore;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(array $payload): void
    {
        $table = $this->tables()->get('board');
        $data = $this->payloadBuilder()->buildCreatePayload($this->updatableFields(), $payload);
        $columns = array_keys($data);
        $placeholders = array_map(static fn (string $column): string => ':' . $column, $columns);

        $this->executeStatement(
            sprintf(
                'INSERT INTO %s (%s) VALUES (%s)',
                $table,
                implode(', ', $columns),
                implode(', ', $placeholders)
            ),
            $data
        );
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function update(string $boTable, array $payload): int
    {
        $table = $this->tables()->get('board');
        $resolved = $this->payloadBuilder()->buildUpdatePayload($this->updatableFields(), $boTable, $payload);
        $sets = $resolved['sets'];
        $params = $resolved['params'];

        if ($sets === []) {
            return 0;
        }

        return $this->executeStatement(
            sprintf('UPDATE %s SET %s WHERE bo_table = :bo_table', $table, implode(', ', $sets)),
            $params
        );
    }

    public function delete(string $boTable): int
    {
        $table = $this->tables()->get('board');

        return $this->executeStatement(
            "DELETE FROM {$table} WHERE bo_table = :bo_table",
            ['bo_table' => $boTable]
        );
    }

    public function copyBoard(
        string $sourceTable,
        string $targetTable,
        string $targetSubject,
        bool $copyPosts = false
    ): void {
        $this->copyStore()->copyBoard($sourceTable, $targetTable, $targetSubject, $copyPosts);
    }

    /**
     * @return list<string>
     */
    private function updatableFields(): array
    {
        return $this->updatableFields ?? self::UPDATABLE_FIELDS;
    }

    private function payloadBuilder(): AdminBoardMutationPayloadBuilder
    {
        if ($this->resolvedPayloadBuilder instanceof AdminBoardMutationPayloadBuilder) {
            return $this->resolvedPayloadBuilder;
        }

        $this->resolvedPayloadBuilder = new AdminBoardMutationPayloadBuilder();

        return $this->resolvedPayloadBuilder;
    }

    private function copyStore(): AdminBoardCopyStore
    {
        if ($this->resolvedCopyStore instanceof AdminBoardCopyStore) {
            return $this->resolvedCopyStore;
        }

        $this->resolvedCopyStore = new AdminBoardCopyStore($this->queryBuilder(), $this->tables());

        return $this->resolvedCopyStore;
    }
}
