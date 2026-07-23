<?php

/**
 * PostDeleteCascadeStore API module.
 *
 * @package  Gnuboard5\Api\v1\Post\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\Config\EnvConfig;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Integration\Contracts\BoardGateway;
use Api\Support\Exception\ApiException;

final class PostDeleteCascadeStore extends PostRepositorySupport
{
    public function __construct(
        BoardGateway $boardRepository,
        private readonly PostQueryRepository $queryRepository,
        private readonly PostScrapRepository $scrapRepository,
        ?QueryBuilder $qb = null,
        ?TableRegistry $tables = null
    ) {
        parent::__construct($boardRepository, $qb, $tables);
    }

    public function deletePost(string $boTable, int $wrId): void
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $boardTable = $this->boardRepository->getBoardTable();
        $goodTable = $this->tables()->get('board_good');
        $boardNewTable = $this->tables()->get('board_new');
        $boardFileTable = $this->tables()->get('board_file');
        $wrIdSafe = (int)$wrId;

        $post = $this->queryRepository->getPost($boTable, $wrIdSafe);
        if ($post === null) {
            throw ApiException::notFound('게시글을 찾을 수 없습니다.');
        }

        $commentRow = $this->fetchAssociative(
            "SELECT COUNT(*) AS cnt
             FROM {$writeTable}
             WHERE wr_parent = :wr_parent
               AND wr_is_comment = 1",
            ['wr_parent' => $wrIdSafe]
        );
        $commentCount = (int)($commentRow['cnt'] ?? 0);

        $this->executeStatement(
            "DELETE FROM {$goodTable}
             WHERE bo_table = :bo_table
               AND wr_id IN (
                    SELECT wr_id FROM {$writeTable} WHERE wr_parent = :wr_parent
               )",
            [
                'bo_table' => $boTable,
                'wr_parent' => $wrIdSafe,
            ]
        );
        $this->scrapRepository->deleteScrapsByPost($boTable, $wrIdSafe);

        $files = $this->fetchAllAssociative(
            "SELECT bf_file
             FROM {$boardFileTable}
             WHERE bo_table = :bo_table
               AND wr_id = :wr_id",
            [
                'bo_table' => $boTable,
                'wr_id' => $wrIdSafe,
            ]
        );

        $this->executeStatement(
            "DELETE FROM {$boardFileTable}
             WHERE bo_table = :bo_table
               AND wr_id = :wr_id",
            [
                'bo_table' => $boTable,
                'wr_id' => $wrIdSafe,
            ]
        );
        $this->executeStatement(
            "DELETE FROM {$boardNewTable}
             WHERE bo_table = :bo_table
               AND wr_parent = :wr_parent",
            [
                'bo_table' => $boTable,
                'wr_parent' => $wrIdSafe,
            ]
        );
        $this->executeStatement(
            "DELETE FROM {$writeTable}
             WHERE wr_parent = :wr_parent",
            ['wr_parent' => $wrIdSafe]
        );
        $this->executeStatement(
            "UPDATE {$boardTable}
             SET bo_count_write = GREATEST(bo_count_write - 1, 0),
                 bo_count_comment = GREATEST(bo_count_comment - :comment_count, 0)
             WHERE bo_table = :bo_table",
            [
                'comment_count' => $commentCount,
                'bo_table' => $boTable,
            ]
        );

        $this->removeBoardFiles($boTable, $files);
    }

    /**
     * @param array<int, array<string,mixed>> $files
     */
    private function removeBoardFiles(string $boTable, array $files): void
    {
        if ($files === []) {
            return;
        }

        $boardDir = $this->dataPath() . '/file/' . $boTable;
        if (!is_dir($boardDir)) {
            return;
        }

        foreach ($files as $file) {
            $filename = basename((string)($file['bf_file'] ?? ''));
            if ($filename === '') {
                continue;
            }

            $filePath = $boardDir . '/' . $filename;
            if (is_file($filePath)) {
                @unlink($filePath);
            }

            $thumbCandidates = [
                $boardDir . '/thumb/' . $filename,
                $boardDir . '/thumb-' . $filename,
            ];
            $thumbCandidates = array_merge(
                $thumbCandidates,
                glob($boardDir . '/thumb-*' . $filename) ?: []
            );

            foreach (array_unique($thumbCandidates) as $thumbPath) {
                if (is_string($thumbPath) && is_file($thumbPath)) {
                    @unlink($thumbPath);
                }
            }
        }
    }

    private function dataPath(): string
    {
        return EnvConfig::resolveDataPath();
    }
}
