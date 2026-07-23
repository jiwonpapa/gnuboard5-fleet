<?php

declare(strict_types=1);

namespace Api\Admin\Dashboard\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;
use Throwable;

final class AdminDashboardRecentPostRepository extends AdminBaseRepository
{
    /**
     * @return list<array<string,mixed>>
     */
    public function recentPosts(int $limit): array
    {
        $boardNewTable = $this->tables()->get('board_new');
        $boardTable = $this->tables()->get('board');
        $groupTable = $this->tables()->get('group');
        $rows = $this->fetchAllAssociative(
            "SELECT
                bn.bn_id,
                bn.bo_table,
                bn.wr_id,
                bn.wr_parent,
                bn.bn_datetime,
                bn.mb_id,
                b.gr_id,
                b.bo_subject,
                g.gr_subject
             FROM {$boardNewTable} bn
             INNER JOIN {$boardTable} b
               ON b.bo_table = bn.bo_table
             LEFT JOIN {$groupTable} g
               ON g.gr_id = b.gr_id
             ORDER BY bn.bn_id DESC
             LIMIT {$limit}"
        );

        return array_map(fn (array $row): array => $this->hydrateRecentPost($row), $rows);
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    private function hydrateRecentPost(array $row): array
    {
        $boTable = trim((string)($row['bo_table'] ?? ''));
        $wrId = (int)($row['wr_id'] ?? 0);
        $wrParent = (int)($row['wr_parent'] ?? 0);
        $writeTable = $this->safeWriteTable($boTable);

        $subject = '';
        $name = '';
        $datetime = (string)($row['bn_datetime'] ?? '');
        $postMemberId = trim((string)($row['mb_id'] ?? ''));
        $parentSubject = '';
        $postExists = false;

        if ($writeTable !== null && $wrParent > 0) {
            if ($wrId !== $wrParent) {
                $parent = $this->fetchAssociative(
                    "SELECT wr_subject
                     FROM {$writeTable}
                     WHERE wr_id = :wr_id
                     LIMIT 1",
                    ['wr_id' => $wrParent]
                );
                $parentSubject = (string)($parent['wr_subject'] ?? '');
            }

            $targetId = $wrId > 0 ? $wrId : $wrParent;
            $post = $this->fetchAssociative(
                "SELECT wr_subject, wr_name, wr_datetime, mb_id
                 FROM {$writeTable}
                 WHERE wr_id = :wr_id
                 LIMIT 1",
                ['wr_id' => $targetId]
            );

            if (is_array($post)) {
                $subject = (string)($post['wr_subject'] ?? '');
                $name = (string)($post['wr_name'] ?? '');
                $datetime = (string)($post['wr_datetime'] ?? $datetime);
                $postMemberId = trim((string)($post['mb_id'] ?? $postMemberId));
                $postExists = true;
            }
        }

        return [
            'bn_id' => (int)($row['bn_id'] ?? 0),
            'gr_id' => (string)($row['gr_id'] ?? ''),
            'gr_subject' => (string)($row['gr_subject'] ?? ''),
            'bo_table' => $boTable,
            'bo_subject' => (string)($row['bo_subject'] ?? ''),
            'wr_id' => $wrId,
            'wr_parent' => $wrParent,
            'view_type' => $wrId === $wrParent ? 'w' : 'c',
            'wr_subject' => $subject,
            'parent_wr_subject' => $parentSubject,
            'wr_name' => $name,
            'wr_datetime' => $datetime,
            'post_mb_id' => $postMemberId,
            'post_exists' => $postExists,
        ];
    }

    private function safeWriteTable(string $boTable): ?string
    {
        try {
            return $this->tables()->writeTable($boTable);
        } catch (Throwable) {
            return null;
        }
    }
}
