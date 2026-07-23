<?php

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\Util\G5DateTime;
use Api\Support\Database\MySqlNamedLock;
use Api\Support\Exception\ApiException;
use Throwable;

final class PostScrapWriteStore extends PostRepositorySupport
{
    public function __construct(
        \Api\Integration\Contracts\BoardGateway $boardRepository,
        private readonly PostScrapCountStore $countStore,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null
    ) {
        parent::__construct($boardRepository, $qb, $tables);
    }

    public function addScrap(string $memberId, string $boTable, int $wrId): int
    {
        $scrapTable = $this->tables()->get('scrap');
        $safeMemberId = trim($memberId);
        $safeWrId = (int)$wrId;

        return MySqlNamedLock::withLock(
            $this->queryBuilder(),
            $this->countStore->scrapMemberLockName($safeMemberId),
            function () use ($scrapTable, $safeMemberId, $boTable, $safeWrId): int {
                try {
                    $this->queryBuilder()->beginTransaction();

                    $existing = $this->fetchAssociative(
                        "SELECT ms_id
                         FROM {$scrapTable}
                         WHERE mb_id = :mb_id
                           AND bo_table = :bo_table
                           AND wr_id = :wr_id
                         LIMIT 1",
                        [
                            'mb_id' => $safeMemberId,
                            'bo_table' => $boTable,
                            'wr_id' => $safeWrId,
                        ]
                    );

                    if (is_array($existing) && (int)($existing['ms_id'] ?? 0) > 0) {
                        throw ApiException::conflict('이미 스크랩한 게시글입니다.');
                    }

                    $this->executeStatement(
                        "INSERT INTO {$scrapTable}
                         SET mb_id = :mb_id,
                             bo_table = :bo_table,
                             wr_id = :wr_id,
                             ms_datetime = :ms_datetime",
                        [
                            'mb_id' => $safeMemberId,
                            'bo_table' => $boTable,
                            'wr_id' => $safeWrId,
                            'ms_datetime' => G5DateTime::now(),
                        ]
                    );

                    $msId = $this->lastInsertId();
                    if ($msId <= 0) {
                        throw ApiException::serverError('스크랩 등록에 실패했습니다.');
                    }

                    $this->countStore->synchronizeScrapCount($safeMemberId);
                    $this->queryBuilder()->commit();

                    return (int)$msId;
                } catch (Throwable $exception) {
                    $this->queryBuilder()->rollback();
                    throw $exception;
                }
            }
        );
    }

    public function removeScrap(string $memberId, string $boTable, int $wrId): void
    {
        $scrapTable = $this->tables()->get('scrap');
        $safeMemberId = trim($memberId);
        $safeWrId = (int)$wrId;

        MySqlNamedLock::withLock(
            $this->queryBuilder(),
            $this->countStore->scrapMemberLockName($safeMemberId),
            function () use ($scrapTable, $safeMemberId, $boTable, $safeWrId): void {
                try {
                    $this->queryBuilder()->beginTransaction();
                    $this->executeStatement(
                        "DELETE FROM {$scrapTable}
                         WHERE mb_id = :mb_id
                           AND bo_table = :bo_table
                           AND wr_id = :wr_id",
                        [
                            'mb_id' => $safeMemberId,
                            'bo_table' => $boTable,
                            'wr_id' => $safeWrId,
                        ]
                    );
                    $this->countStore->synchronizeScrapCount($safeMemberId);
                    $this->queryBuilder()->commit();
                } catch (Throwable $exception) {
                    $this->queryBuilder()->rollback();
                    throw $exception;
                }
            }
        );
    }

    public function isScraped(string $memberId, string $boTable, int $wrId): bool
    {
        $scrapTable = $this->tables()->get('scrap');
        $row = $this->fetchAssociative(
            "SELECT ms_id
             FROM {$scrapTable}
             WHERE mb_id = :mb_id
               AND bo_table = :bo_table
               AND wr_id = :wr_id
             LIMIT 1",
            [
                'mb_id' => trim($memberId),
                'bo_table' => $boTable,
                'wr_id' => (int)$wrId,
            ]
        );

        return is_array($row);
    }
}
