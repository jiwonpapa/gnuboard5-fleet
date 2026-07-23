<?php

/**
 * PostWriteRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Post\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Integration\Contracts\BoardGateway;

final class PostWriteRepository extends PostRepositorySupport
{
    private readonly PostCreateRepository $createRepository;
    private readonly PostReplyRepository $replyRepository;

    public function __construct(
        BoardGateway $boardRepository,
        \Api\Core\Database\QueryBuilder $qb,
        \Api\Core\Database\TableRegistry $tables,
        PostCreateRepository $createRepository,
        PostReplyRepository $replyRepository
    ) {
        parent::__construct($boardRepository, $qb, $tables);
        $this->createRepository = $createRepository;
        $this->replyRepository = $replyRepository;
    }

    public function createPost(
        string $boTable,
        array $member,
        string $subject,
        string $content,
        ?string $category,
        ?string $option,
        bool $isNotice,
        string $ip,
        ?string $link1 = null,
        ?string $link2 = null
    ): int {
        return $this->createRepository->createPost(
            $boTable,
            $member,
            $subject,
            $content,
            $category,
            $option,
            $isNotice,
            $ip,
            $link1,
            $link2
        );
    }

    public function updatePost(string $boTable, int $wrId, array $updates): void
    {
        $writeTable = $this->boardRepository->getWriteTable($boTable);

        $setClauses = [];
        $params = ['wr_id' => (int)$wrId];
        foreach ($updates as $column => $value) {
            if (!in_array($column, ['wr_subject', 'wr_content', 'ca_name', 'wr_option', 'wr_link1', 'wr_link2'], true)) {
                continue;
            }

            $param = 'u_' . $column;
            $setClauses[] = "{$column} = :{$param}";
            $params[$param] = (string)$value;
        }

        if ($setClauses === []) {
            return;
        }

        $setSql = implode(', ', $setClauses);
        $this->executeStatement(
            "UPDATE {$writeTable}
             SET {$setSql}
             WHERE wr_id = :wr_id
               AND wr_is_comment = 0",
            $params
        );
    }

    public function createReply(
        string $boTable,
        int $parentWrId,
        array $member,
        string $subject,
        string $content,
        ?string $option,
        string $ip
    ): int {
        return $this->replyRepository->createReply(
            $boTable,
            $parentWrId,
            $member,
            $subject,
            $content,
            $option,
            $ip
        );
    }
}
