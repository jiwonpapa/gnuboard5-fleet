<?php

declare(strict_types=1);

namespace Api\File\Repository;

use Api\Core\DTO\FileDTO;
use Api\Integration\Contracts\BoardGateway;

final class FileRecordMutationStore extends FileRepositorySupport
{
    public function __construct(
        private readonly BoardGateway $boardRepository,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null
    ) {
        parent::__construct($qb, $tables);
    }

    public function createFileRecord(
        string $boTable,
        int $wrId,
        int $bfNo,
        string $source,
        string $file,
        int $filesize,
        int $width,
        int $height,
        int $type,
        string $mime,
        string $datetime
    ): FileDTO {
        $sql = "INSERT INTO {$this->getBoardFileTable()} (
                bo_table, wr_id, bf_no, bf_source, bf_file, bf_content, bf_fileurl, bf_thumburl,
                bf_storage, bf_download, bf_filesize, bf_width, bf_height, bf_type, bf_datetime
            ) VALUES (
                :bo_table, :wr_id, :bf_no, :bf_source, :bf_file, '', '', '', '', 0,
                :bf_filesize, :bf_width, :bf_height, :bf_type, :bf_datetime
            )";

        $this->executeStatement($sql, [
            'bo_table' => $boTable,
            'wr_id' => $wrId,
            'bf_no' => $bfNo,
            'bf_source' => $source,
            'bf_file' => $file,
            'bf_filesize' => $filesize,
            'bf_width' => $width,
            'bf_height' => $height,
            'bf_type' => $type,
            'bf_datetime' => $datetime,
        ]);

        return FileDTO::fromRow([
            'bo_table' => $boTable,
            'wr_id' => $wrId,
            'bf_no' => $bfNo,
            'bf_source' => $source,
            'bf_file' => $file,
            'bf_content' => '',
            'bf_fileurl' => '',
            'bf_thumburl' => '',
            'bf_storage' => '',
            'bf_download' => 0,
            'bf_filesize' => $filesize,
            'bf_width' => $width,
            'bf_height' => $height,
            'bf_type' => $type,
            'bf_datetime' => $datetime,
            'bf_file_mime' => $mime,
        ]);
    }

    public function deleteFileRecord(string $boTable, int $wrId, int $bfNo): int
    {
        return $this->executeStatement(
            "DELETE FROM {$this->getBoardFileTable()}
             WHERE bo_table = :bo_table
               AND wr_id = :wr_id
               AND bf_no = :bf_no",
            [
                'bo_table' => $boTable,
                'wr_id' => $wrId,
                'bf_no' => $bfNo,
            ]
        );
    }

    public function incrementDownloadCount(string $boTable, int $wrId, int $bfNo): void
    {
        $this->executeStatement(
            "UPDATE {$this->getBoardFileTable()}
                SET bf_download = bf_download + 1
             WHERE bo_table = :bo_table AND wr_id = :wr_id AND bf_no = :bf_no",
            [
                'bo_table' => $boTable,
                'wr_id' => $wrId,
                'bf_no' => $bfNo,
            ]
        );
    }

    public function updateWriteFileCount(string $boTable, int $wrId): void
    {
        if ($wrId <= 0) {
            return;
        }

        $countRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt FROM {$this->getBoardFileTable()} WHERE bo_table = :bo_table AND wr_id = :wr_id",
            [
                'bo_table' => $boTable,
                'wr_id' => $wrId,
            ]
        );

        $this->executeStatement(
            "UPDATE {$this->boardRepository->getWriteTable($boTable)} SET wr_file = :wr_file WHERE wr_id = :wr_id",
            [
                'wr_file' => (int)($countRow['cnt'] ?? 0),
                'wr_id' => $wrId,
            ]
        );
    }
}
