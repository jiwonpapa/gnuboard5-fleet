<?php

declare(strict_types=1);

namespace Api\File\Repository;

use Api\Core\DTO\FileDTO;
use Api\Integration\Contracts\BoardGateway;

final class FileRecordRepository extends FileRepositorySupport
{
    private ?FileRecordQueryStore $resolvedQueryStore = null;
    private ?FileRecordMutationStore $resolvedMutationStore = null;

    public function __construct(
        private readonly BoardGateway $boardRepository,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null,
        ?FileRecordQueryStore $queryStore = null,
        ?FileRecordMutationStore $mutationStore = null
    ) {
        parent::__construct($qb, $tables);
        $this->resolvedQueryStore = $queryStore;
        $this->resolvedMutationStore = $mutationStore;
    }

    public function countFiles(string $boTable, int $wrId): int
    {
        return $this->queryStore()->countFiles($boTable, $wrId);
    }

    public function getNextBfNo(string $boTable, int $wrId): int
    {
        return $this->queryStore()->getNextBfNo($boTable, $wrId);
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
        return $this->mutationStore()->createFileRecord(
            $boTable,
            $wrId,
            $bfNo,
            $source,
            $file,
            $filesize,
            $width,
            $height,
            $type,
            $mime,
            $datetime
        );
    }

    public function getFile(string $boTable, int $wrId, int $bfNo): ?FileDTO
    {
        return $this->queryStore()->getFile($boTable, $wrId, $bfNo);
    }

    /**
     * @return list<FileDTO>
     */
    public function listFiles(string $boTable, int $wrId): array
    {
        return $this->queryStore()->listFiles($boTable, $wrId);
    }

    public function deleteFileRecord(string $boTable, int $wrId, int $bfNo): int
    {
        return $this->mutationStore()->deleteFileRecord($boTable, $wrId, $bfNo);
    }

    public function incrementDownloadCount(string $boTable, int $wrId, int $bfNo): void
    {
        $this->mutationStore()->incrementDownloadCount($boTable, $wrId, $bfNo);
    }

    public function updateWriteFileCount(string $boTable, int $wrId): void
    {
        $this->mutationStore()->updateWriteFileCount($boTable, $wrId);
    }

    private function queryStore(): FileRecordQueryStore
    {
        if ($this->resolvedQueryStore instanceof FileRecordQueryStore) {
            return $this->resolvedQueryStore;
        }

        $this->resolvedQueryStore = new FileRecordQueryStore($this->queryBuilder(), $this->tables());

        return $this->resolvedQueryStore;
    }

    private function mutationStore(): FileRecordMutationStore
    {
        if ($this->resolvedMutationStore instanceof FileRecordMutationStore) {
            return $this->resolvedMutationStore;
        }

        $this->resolvedMutationStore = new FileRecordMutationStore(
            $this->boardRepository,
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->resolvedMutationStore;
    }
}
