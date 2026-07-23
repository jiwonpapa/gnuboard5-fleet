<?php

/**
 * PostReactionRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Post\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\Enum\VoteType;
use Api\Core\Util\G5DateTime;
use Api\Integration\Contracts\BoardGateway;
use Api\Support\Database\MySqlNamedLock;
use Api\Support\Exception\ApiException;

final class PostReactionRepository extends PostRepositorySupport
{
    public function __construct(
        BoardGateway $boardRepository,
        private readonly PostQueryRepository $queryRepository,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null
    ) {
        parent::__construct($boardRepository, $qb, $tables);
    }

    /**
     * @param array<string,mixed> $member
     * @return array{wr_good:int,wr_nogood:int}
     */
    public function castVote(string $boTable, int $wrId, array $member, string $voteType): array
    {
        $vote = $this->normalizeVoteType($voteType);
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $goodTable = $this->getBoardGoodTable();

        $memberId = trim((string)($member['mb_id'] ?? ''));
        if ($memberId === '') {
            throw ApiException::unauthorized('인증 사용자 정보가 없습니다.');
        }

        $wrIdSafe = (int)$wrId;

        return MySqlNamedLock::withLock(
            $this->queryBuilder(),
            $this->voteLockName($memberId, $boTable, $wrIdSafe),
            function () use ($vote, $writeTable, $goodTable, $memberId, $boTable, $wrIdSafe): array {
                $post = $this->queryRepository->getPost($boTable, $wrIdSafe);
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
                        'bo_table' => $boTable,
                        'wr_id' => $wrIdSafe,
                        'mb_id' => $memberId,
                    ]
                );

                if ($existing !== false && is_array($existing) && isset($existing['bg_flag']) && $existing['bg_flag'] !== '') {
                    throw ApiException::conflict('이미 추천/비추천한 게시글입니다.');
                }

                $now = G5DateTime::now();
                $this->executeStatement(
                    "INSERT INTO {$goodTable}
                     SET bo_table = :bo_table,
                         wr_id = :wr_id,
                         mb_id = :mb_id,
                         bg_flag = :bg_flag,
                         bg_datetime = :bg_datetime",
                    [
                        'bo_table' => $boTable,
                        'wr_id' => $wrIdSafe,
                        'mb_id' => $memberId,
                        'bg_flag' => $vote->value,
                        'bg_datetime' => $now,
                    ]
                );
                $this->executeStatement(
                    "UPDATE {$writeTable}
                     SET wr_{$vote->value} = wr_{$vote->value} + 1
                     WHERE wr_id = :wr_id",
                    ['wr_id' => $wrIdSafe]
                );

                $score = $this->fetchAssociative(
                    "SELECT wr_good, wr_nogood
                     FROM {$writeTable}
                     WHERE wr_id = :wr_id",
                    ['wr_id' => $wrIdSafe]
                );
                if ($score === false) {
                    throw ApiException::serverError('추천 점수 조회 실패');
                }

                return [
                    'wr_good' => (int)($score['wr_good'] ?? 0),
                    'wr_nogood' => (int)($score['wr_nogood'] ?? 0),
                ];
            }
        );
    }

    public function increaseHit(string $boTable, int $wrId): void
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $wrIdSafe = (int)$wrId;
        $this->executeStatement(
            "UPDATE {$writeTable}
             SET wr_hit = wr_hit + 1
             WHERE wr_id = :wr_id",
            ['wr_id' => $wrIdSafe]
        );
    }

    private function normalizeVoteType(string $voteType): VoteType
    {
        $resolved = VoteType::tryFrom(strtolower(trim($voteType)));
        if (!$resolved instanceof VoteType) {
            throw ApiException::badRequest('vote type은 good 또는 nogood만 허용됩니다.');
        }

        return $resolved;
    }

    private function getBoardGoodTable(): string
    {
        return $this->tables()->get('board_good');
    }

    private function voteLockName(string $memberId, string $boTable, int $wrId): string
    {
        return sprintf('vote:%s:%s:%d', $memberId, $boTable, $wrId);
    }
}
