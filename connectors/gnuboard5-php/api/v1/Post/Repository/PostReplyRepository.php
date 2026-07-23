<?php

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Integration\Contracts\BoardGateway;

final class PostReplyRepository extends PostWriteSupport
{
    private ?PostReplySequenceResolver $resolvedSequenceResolver = null;
    private ?PostReplyWriteStore $resolvedWriteStore = null;

    public function __construct(
        BoardGateway $boardRepository,
        private readonly PostQueryRepository $queryRepository,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null,
        ?PostReplySequenceResolver $sequenceResolver = null,
        ?PostReplyWriteStore $writeStore = null
    ) {
        parent::__construct($boardRepository, $qb, $tables);
        $this->resolvedSequenceResolver = $sequenceResolver;
        $this->resolvedWriteStore = $writeStore;
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
        $resolved = $this->sequenceResolver()->resolve($boTable, $parentWrId);

        return $this->writeStore()->createReply(
            $boTable,
            $resolved['parent'],
            $resolved['wr_reply'],
            $member,
            $subject,
            $content,
            $option,
            $ip
        );
    }

    private function sequenceResolver(): PostReplySequenceResolver
    {
        if ($this->resolvedSequenceResolver instanceof PostReplySequenceResolver) {
            return $this->resolvedSequenceResolver;
        }

        $this->resolvedSequenceResolver = new PostReplySequenceResolver(
            $this->boardRepository,
            $this->queryRepository,
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->resolvedSequenceResolver;
    }

    private function writeStore(): PostReplyWriteStore
    {
        if ($this->resolvedWriteStore instanceof PostReplyWriteStore) {
            return $this->resolvedWriteStore;
        }

        $this->resolvedWriteStore = new PostReplyWriteStore(
            $this->boardRepository,
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->resolvedWriteStore;
    }
}
