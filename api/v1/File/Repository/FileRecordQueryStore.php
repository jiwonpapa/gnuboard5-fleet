<?php

declare(strict_types=1);

namespace Api\File\Repository;

use Api\Core\DTO\FileDTO;

final class FileRecordQueryStore extends FileRepositorySupport
{
    public function countFiles(string $boTable, int $wrId): int
    {
        $row = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$this->getBoardFileTable()} WHERE bo_table = :bo_table AND wr_id = :wr_id",
            [
                'bo_table' => $boTable,
                'wr_id' => $wrId,
            ]
        );

        return (int)($row['cnt'] ?? 0);
    }

    public function getNextBfNo(string $boTable, int $wrId): int
    {
        $row = $this->fetchAssociative(
            "SELECT MAX(bf_no) AS max_bf_no FROM {$this->getBoardFileTable()} WHERE bo_table = :bo_table AND wr_id = :wr_id",
            [
                'bo_table' => $boTable,
                'wr_id' => $wrId,
            ]
        );

        return (int)($row['max_bf_no'] ?? -1) + 1;
    }

    public function getFile(string $boTable, int $wrId, int $bfNo): ?FileDTO
    {
        $row = $this->fetchAssociative(
            "SELECT
                bo_table,
                wr_id,
                bf_no,
                bf_source,
                bf_file,
                bf_download,
                bf_filesize,
                bf_width,
                bf_height,
                bf_type,
                bf_datetime
            FROM {$this->getBoardFileTable()}
            WHERE bo_table = :bo_table AND wr_id = :wr_id AND bf_no = :bf_no
            LIMIT 1",
            [
                'bo_table' => $boTable,
                'wr_id' => $wrId,
                'bf_no' => $bfNo,
            ]
        );

        return is_array($row) ? FileDTO::fromRow($row) : null;
    }

    /**
     * @return list<FileDTO>
     */
    public function listFiles(string $boTable, int $wrId): array
    {
        $rows = $this->fetchAllAssociative(
            "SELECT
                bo_table,
                wr_id,
                bf_no,
                bf_source,
                bf_file,
                bf_download,
                bf_filesize,
                bf_width,
                bf_height,
                bf_type,
                bf_datetime
             FROM {$this->getBoardFileTable()}
             WHERE bo_table = :bo_table
               AND wr_id = :wr_id
             ORDER BY bf_no ASC",
            [
                'bo_table' => $boTable,
                'wr_id' => $wrId,
            ]
        );

        return array_map(
            static fn (array $row): FileDTO => FileDTO::fromRow($row),
            $rows
        );
    }
}
