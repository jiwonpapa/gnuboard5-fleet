<?php

declare(strict_types=1);

namespace Api\Admin\Board\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminBoardCopyStore extends AdminBaseRepository
{
    public function copyBoard(
        string $sourceTable,
        string $targetTable,
        string $targetSubject,
        bool $copyPosts = false
    ): void {
        $boardTable = $this->tables()->get('board');
        $source = $this->fetchAssociative(
            "SELECT *
             FROM {$boardTable}
             WHERE bo_table = :bo_table
             LIMIT 1",
            ['bo_table' => $sourceTable]
        );
        if (!is_array($source)) {
            return;
        }

        $insert = $source;
        $insert['bo_table'] = $targetTable;
        $insert['bo_subject'] = $targetSubject;
        if (!$copyPosts) {
            $insert['bo_count_write'] = 0;
            $insert['bo_count_comment'] = 0;
            $insert['bo_notice'] = '';
        }

        $columns = array_keys($insert);
        $placeholders = array_map(static fn (string $column): string => ':' . $column, $columns);
        $this->executeStatement(
            sprintf(
                'INSERT INTO %s (%s) VALUES (%s)',
                $boardTable,
                implode(', ', $columns),
                implode(', ', $placeholders)
            ),
            $insert
        );

        $sourceWriteTable = $this->tables()->writeTable($sourceTable);
        $targetWriteTable = $this->tables()->writeTable($targetTable);
        $this->executeStatement("CREATE TABLE {$targetWriteTable} LIKE {$sourceWriteTable}");
        if (!$copyPosts) {
            return;
        }

        $this->executeStatement("INSERT INTO {$targetWriteTable} SELECT * FROM {$sourceWriteTable}");

        $boardFileTable = $this->tables()->get('board_file');
        $columns = [
            'bo_table',
            'wr_id',
            'bf_no',
            'bf_source',
            'bf_file',
            'bf_download',
            'bf_content',
            'bf_fileurl',
            'bf_thumburl',
            'bf_storage',
            'bf_filesize',
            'bf_width',
            'bf_height',
            'bf_type',
            'bf_datetime',
        ];
        $selectColumns = $columns;
        $selectColumns[0] = ':target_bo_table';
        $this->executeStatement(
            sprintf(
                'INSERT INTO %s (%s) SELECT %s FROM %s WHERE bo_table = :source_bo_table',
                $boardFileTable,
                implode(', ', $columns),
                implode(', ', $selectColumns),
                $boardFileTable
            ),
            [
                'target_bo_table' => $targetTable,
                'source_bo_table' => $sourceTable,
            ]
        );
    }
}
