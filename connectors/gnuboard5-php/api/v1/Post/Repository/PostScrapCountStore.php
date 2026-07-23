<?php

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Support\Database\MySqlNamedLock;

final class PostScrapCountStore extends PostRepositorySupport
{
    public function deleteScrapsByPost(string $boTable, int $wrId): void
    {
        $scrapTable = $this->tables()->get('scrap');
        $rows = $this->fetchAllAssociative(
            "SELECT DISTINCT mb_id
             FROM {$scrapTable}
             WHERE bo_table = :bo_table
               AND wr_id = :wr_id",
            [
                'bo_table' => $boTable,
                'wr_id' => (int)$wrId,
            ]
        );

        $this->executeStatement(
            "DELETE FROM {$scrapTable}
             WHERE bo_table = :bo_table
               AND wr_id = :wr_id",
            [
                'bo_table' => $boTable,
                'wr_id' => (int)$wrId,
            ]
        );

        foreach ($rows as $row) {
            $memberId = trim((string)($row['mb_id'] ?? ''));
            if ($memberId === '') {
                continue;
            }

            $this->updateScrapCount($memberId);
        }
    }

    public function updateScrapCount(string $memberId): void
    {
        $memberId = trim($memberId);
        if ($memberId === '') {
            return;
        }

        MySqlNamedLock::withLock(
            $this->queryBuilder(),
            $this->scrapMemberLockName($memberId),
            function () use ($memberId): void {
                $this->synchronizeScrapCount($memberId);
            }
        );
    }

    public function synchronizeScrapCount(string $memberId): void
    {
        $memberTable = $this->tables()->get('member');
        $scrapTable = $this->tables()->get('scrap');

        $this->executeStatement(
            "UPDATE {$memberTable}
             SET mb_scrap_cnt = (
                 SELECT COUNT(*)
                 FROM {$scrapTable}
                 WHERE mb_id = :mb_id
             )
             WHERE mb_id = :mb_id",
            ['mb_id' => $memberId]
        );
    }

    public function scrapMemberLockName(string $memberId): string
    {
        return 'scrap:member:' . $memberId;
    }
}
