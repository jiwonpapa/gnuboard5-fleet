<?php

/**
 * PostNoticeRepository API module.
 *
 * @package  Gnuboard5\Api\v1\Post\Repository
 * @since    v1.0.0
 */

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Integration\Contracts\BoardGateway;

final class PostNoticeRepository extends PostRepositorySupport
{
    private ?PostNoticeMutationStore $resolvedNoticeStore = null;
    private ?PostDeleteCascadeStore $resolvedDeleteStore = null;

    public function __construct(
        BoardGateway $boardRepository,
        private readonly PostQueryRepository $queryRepository,
        private readonly PostScrapRepository $scrapRepository,
        ?\Api\Core\Database\QueryBuilder $qb = null,
        ?\Api\Core\Database\TableRegistry $tables = null,
        ?PostNoticeMutationStore $noticeStore = null,
        ?PostDeleteCascadeStore $deleteStore = null
    ) {
        parent::__construct($boardRepository, $qb, $tables);
        $this->resolvedNoticeStore = $noticeStore;
        $this->resolvedDeleteStore = $deleteStore;
    }

    public function setNotice(string $boTable, int $wrId, bool $isNotice): void
    {
        $this->noticeStore()->setNotice($boTable, $wrId, $isNotice);
    }

    public function deletePost(string $boTable, int $wrId): void
    {
        $this->noticeStore()->setNotice($boTable, $wrId, false);
        $this->deleteStore()->deletePost($boTable, $wrId);
    }

    private function noticeStore(): PostNoticeMutationStore
    {
        if ($this->resolvedNoticeStore instanceof PostNoticeMutationStore) {
            return $this->resolvedNoticeStore;
        }

        $this->resolvedNoticeStore = new PostNoticeMutationStore(
            $this->boardRepository,
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->resolvedNoticeStore;
    }

    private function deleteStore(): PostDeleteCascadeStore
    {
        if ($this->resolvedDeleteStore instanceof PostDeleteCascadeStore) {
            return $this->resolvedDeleteStore;
        }

        $this->resolvedDeleteStore = new PostDeleteCascadeStore(
            $this->boardRepository,
            $this->queryRepository,
            $this->scrapRepository,
            $this->queryBuilder(),
            $this->tables()
        );

        return $this->resolvedDeleteStore;
    }
}
