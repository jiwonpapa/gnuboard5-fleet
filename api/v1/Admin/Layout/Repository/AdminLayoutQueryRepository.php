<?php

declare(strict_types=1);

namespace Api\Admin\Layout\Repository;

use Throwable;

final class AdminLayoutQueryRepository extends AdminLayoutRepositoryBase
{
    /**
     * @return array{items: array<int, array<string, mixed>>, total: int}
     */
    public function list(int $page, int $perPage): array
    {
        $offset = max(0, ($page - 1) * $perPage);
        $limit = max(1, $perPage);

        try {
            $items = $this->fetchAllAssociative(
                "SELECT sl_id, sl_page_id, sl_title, sl_active, sl_datetime, sl_updated
                 FROM {$this->layoutTable()}
                 ORDER BY sl_id DESC
                 LIMIT {$limit} OFFSET {$offset}"
            );

            $count = $this->fetchAssociative("SELECT COUNT(*) AS cnt FROM {$this->layoutTable()}");
        } catch (Throwable $exception) {
            if ($this->isMissingTable($exception)) {
                return ['items' => [], 'total' => 0];
            }

            throw $exception;
        }

        return [
            'items' => $items,
            'total' => (int)($count['cnt'] ?? 0),
        ];
    }

    public function detail(string $pageId): ?array
    {
        try {
            $row = $this->fetchAssociative(
                "SELECT sl_id, sl_page_id, sl_title, sl_schema, sl_active, sl_datetime, sl_updated
                 FROM {$this->layoutTable()}
                 WHERE sl_page_id = :sl_page_id
                 LIMIT 1",
                ['sl_page_id' => $pageId]
            );
        } catch (Throwable $exception) {
            if ($this->isMissingTable($exception)) {
                return null;
            }

            throw $exception;
        }

        return is_array($row) ? $row : null;
    }
}
