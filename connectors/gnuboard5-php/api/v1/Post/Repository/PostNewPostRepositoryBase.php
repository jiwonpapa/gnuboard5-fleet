<?php

declare(strict_types=1);

namespace Api\Post\Repository;

use Throwable;

abstract class PostNewPostRepositoryBase extends PostRepositorySupport
{
    /**
     * @return array{0:string,1:array<string,mixed>}
     */
    protected function buildFilters(?string $grId, ?string $view, ?string $mbId): array
    {
        $conditions = ['b.bo_use_search = 1'];
        $params = [];

        $grId = trim((string)$grId);
        if ($grId !== '') {
            $conditions[] = 'b.gr_id = :gr_id';
            $params['gr_id'] = $grId;
        }

        if ($view === 'w') {
            $conditions[] = 'bn.wr_id = bn.wr_parent';
        } elseif ($view === 'c') {
            $conditions[] = 'bn.wr_id <> bn.wr_parent';
        }

        $mbId = trim((string)$mbId);
        if ($mbId !== '') {
            $conditions[] = 'bn.mb_id = :mb_id';
            $params['mb_id'] = $mbId;
        }

        return [implode(' AND ', $conditions), $params];
    }

    protected function safeWriteTable(string $boTable): ?string
    {
        if (preg_match('/^[A-Za-z0-9_]{1,20}$/', $boTable) !== 1) {
            return null;
        }

        try {
            return $this->boardRepository->getWriteTable($boTable);
        } catch (Throwable) {
            return null;
        }
    }

    protected function buildCursorType(?string $grId, ?string $view, ?string $mbId): string
    {
        return 'post.new.' . trim((string)$grId) . '.' . trim((string)$view) . '.' . trim((string)$mbId);
    }
}
