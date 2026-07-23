<?php

/**
 * LikeRepository API 모듈 정의.
 *
 * @package  Gnuboard5\Api\v1\Like\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Like\Repository;

use Api\Core\Enum\VoteType;
use Api\Core\Database\QueryBuilder;
use Api\Core\Database\TableRegistry;
use Api\Core\Util\G5DateTime;
use Api\Integration\Contracts\BoardGateway;
use Api\Integration\Contracts\LikeGateway as LegacyLikeGateway;
use Api\Like\Contracts\LikeGateway;
use Api\Support\Database\MySqlNamedLock;
use Api\Support\Exception\ApiException;
use Throwable;

final class LikeRepository implements LikeGateway, LegacyLikeGateway
{
    private ?QueryBuilder $resolvedQueryBuilder = null;

    private ?TableRegistry $resolvedTableRegistry = null;

    public function __construct(
        private readonly BoardGateway $boardRepository,
        private readonly ?QueryBuilder $qb = null,
        private readonly ?TableRegistry $tables = null
    ) {
    }

    public function castVote(string $boTable, int $wrId, string $memberId, VoteType $voteType): array
    {
        $safeBoTable = $boTable;
        $safeWrId = (int)$wrId;
        $voteTypeSafe = $voteType->value;
        $goodTable = $this->getBoardGoodTable();

        return MySqlNamedLock::withLock(
            $this->queryBuilder(),
            $this->voteLockName($memberId, $safeBoTable, $safeWrId),
            function () use ($safeBoTable, $safeWrId, $voteTypeSafe, $goodTable, $boTable, $memberId): array {
                $writeTable = $this->boardRepository->getWriteTable($boTable);
                $post = $this->getWritablePost($writeTable, $safeWrId);
                if ($post === null) {
                    throw ApiException::notFound('게시글을 찾을 수 없습니다.');
                }

                if ((string)($post['mb_id'] ?? '') === $memberId) {
                    throw ApiException::forbidden('자신의 글에는 추천/비추천할 수 없습니다.');
                }

                $existing = $this->fetchAssociative(
                    "SELECT bg_flag FROM {$goodTable}
                     WHERE bo_table = :bo_table
                       AND wr_id = :wr_id
                       AND mb_id = :mb_id
                       AND bg_flag IN ('good','nogood')
                     LIMIT 1",
                    [
                        'bo_table' => $safeBoTable,
                        'wr_id' => $safeWrId,
                        'mb_id' => $memberId,
                    ]
                );
                if ($existing !== false && is_array($existing) && trim((string)($existing['bg_flag'] ?? '')) !== '') {
                    throw ApiException::conflict('이미 추천/비추천한 게시글입니다.');
                }

                $now = G5DateTime::now();

                try {
                    $this->queryBuilder()->beginTransaction();
                    $this->executeStatement(
                        "INSERT INTO {$goodTable} (bo_table, wr_id, mb_id, bg_flag, bg_datetime)
                         VALUES (:bo_table, :wr_id, :mb_id, :bg_flag, :bg_datetime)",
                        [
                            'bo_table' => $safeBoTable,
                            'wr_id' => $safeWrId,
                            'mb_id' => $memberId,
                            'bg_flag' => $voteTypeSafe,
                            'bg_datetime' => $now,
                        ]
                    );
                    $this->executeStatement(
                        "UPDATE {$writeTable} SET wr_{$voteTypeSafe} = wr_{$voteTypeSafe} + 1 WHERE wr_id = :wr_id AND wr_is_comment = 0",
                        ['wr_id' => $safeWrId]
                    );

                    $score = $this->fetchAssociative(
                        "SELECT wr_good, wr_nogood FROM {$writeTable} WHERE wr_id = :wr_id",
                        ['wr_id' => $safeWrId]
                    );
                    if ($score === false) {
                        throw ApiException::serverError('추천 점수 조회 실패');
                    }

                    $this->queryBuilder()->commit();
                } catch (Throwable $exception) {
                    $this->queryBuilder()->rollback();
                    throw $exception;
                }

                return [
                    'wr_good' => (int)($score['wr_good'] ?? 0),
                    'wr_nogood' => (int)($score['wr_nogood'] ?? 0),
                ];
            }
        );
    }

    private function getWritablePost(string $writeTable, int $wrId): ?array
    {
        $row = $this->fetchAssociative(
            "SELECT wr_id, mb_id FROM {$writeTable}
             WHERE wr_id = :wr_id AND wr_is_comment = 0
             LIMIT 1",
            ['wr_id' => $wrId]
        );
        if ($row === false) {
            return null;
        }

        return $row;
    }

    private function getBoardGoodTable(): string
    {
        return $this->tables()->get('board_good');
    }

    private function queryBuilder(): QueryBuilder
    {
        if ($this->resolvedQueryBuilder instanceof QueryBuilder) {
            return $this->resolvedQueryBuilder;
        }

        $this->resolvedQueryBuilder = $this->qb instanceof QueryBuilder
            ? $this->qb
            : new QueryBuilder();

        return $this->resolvedQueryBuilder;
    }

    private function tables(): TableRegistry
    {
        if ($this->resolvedTableRegistry instanceof TableRegistry) {
            return $this->resolvedTableRegistry;
        }

        $this->resolvedTableRegistry = $this->tables instanceof TableRegistry
            ? $this->tables
            : new TableRegistry();

        return $this->resolvedTableRegistry;
    }

    /**
     * @param array<string, mixed> $params
     */
    private function fetchAssociative(string $sql, array $params = []): array|false
    {
        return $this->queryBuilder()->executeQuery($sql, $params)->fetchAssociative();
    }

    /**
     * @param array<string, mixed> $params
     */
    private function executeStatement(string $sql, array $params = []): int
    {
        return $this->queryBuilder()->executeStatement($sql, $params);
    }

    private function voteLockName(string $memberId, string $boTable, int $wrId): string
    {
        return sprintf('vote:%s:%s:%d', $memberId, $boTable, $wrId);
    }
}
