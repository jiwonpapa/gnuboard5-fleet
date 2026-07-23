<?php

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Integration\Contracts\BoardGateway;
use Api\Support\Exception\ApiException;

final class PostReplySequenceResolver extends PostWriteSupport
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
     * @return array{parent: array<string, mixed>, wr_reply: string}
     */
    public function resolve(string $boTable, int $parentWrId): array
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);
        $parent = $this->queryRepository->getPost($boTable, $parentWrId);
        if ($parent === null) {
            throw ApiException::notFound('원글을 찾을 수 없습니다.');
        }

        $board = $this->boardRepository->findBoard($boTable) ?? [];
        $parentReply = (string)($parent['wr_reply'] ?? '');
        if (strlen($parentReply) >= 10) {
            throw ApiException::forbidden('답변은 10단계를 초과할 수 없습니다.');
        }

        $replyLength = strlen($parentReply) + 1;
        $replyPrefixLike = $parentReply . '%';
        $orderAsc = (int)($board['bo_reply_order'] ?? 0) === 1;
        $orderSql = $orderAsc ? 'DESC' : 'ASC';

        $sibling = $this->fetchAssociative(
            "SELECT wr_reply
             FROM {$writeTable}
             WHERE wr_num = :wr_num
               AND wr_reply LIKE :reply_like
               AND LENGTH(wr_reply) = :reply_len
               AND wr_is_comment = 0
             ORDER BY wr_reply {$orderSql}
             LIMIT 1",
            [
                'wr_num' => (int)($parent['wr_num'] ?? 0),
                'reply_like' => $replyPrefixLike,
                'reply_len' => $replyLength,
            ]
        );

        $nextAscii = $orderAsc ? 65 : 90;
        if (is_array($sibling) && isset($sibling['wr_reply'])) {
            $latestReply = (string)$sibling['wr_reply'];
            $latestChar = $latestReply === '' ? '' : substr($latestReply, -1);
            if ($latestChar !== '') {
                $latestAscii = ord($latestChar);
                $nextAscii = $orderAsc ? $latestAscii + 1 : $latestAscii - 1;
            }
        }

        if ($nextAscii < 65 || $nextAscii > 90) {
            throw ApiException::forbidden('답변은 최대 26개까지만 허용됩니다.');
        }

        return [
            'parent' => $parent,
            'wr_reply' => $parentReply . chr($nextAscii),
        ];
    }
}
