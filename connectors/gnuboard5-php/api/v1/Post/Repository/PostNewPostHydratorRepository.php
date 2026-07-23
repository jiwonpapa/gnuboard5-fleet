<?php

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\DTO\PostDTO;

final class PostNewPostHydratorRepository extends PostNewPostRepositoryBase
{
    /**
     * @param array<string, mixed> $row
     * @return array<string,mixed>
     */
    public function hydrateNewPostItem(array $row): array
    {
        $boTable = trim((string)($row['bo_table'] ?? ''));
        $wrId = (int)($row['wr_id'] ?? 0);
        $wrParent = (int)($row['wr_parent'] ?? 0);
        $writeTable = $this->safeWriteTable($boTable);

        $post = false;
        $parentSubject = '';
        if ($writeTable !== null && $wrId > 0) {
            $post = $this->fetchAssociative(
                "SELECT wr_subject, wr_name, wr_datetime, mb_id
                 FROM {$writeTable}
                 WHERE wr_id = :wr_id
                 LIMIT 1",
                ['wr_id' => $wrId]
            );
        }
        $postData = is_array($post) ? PostDTO::fromRow($post)->jsonSerialize() : [];

        if ($writeTable !== null && $wrParent > 0 && $wrId !== $wrParent) {
            $parent = $this->fetchAssociative(
                "SELECT wr_subject
                 FROM {$writeTable}
                 WHERE wr_id = :wr_id
                 LIMIT 1",
                ['wr_id' => $wrParent]
            );
            $parentSubject = (string)($parent['wr_subject'] ?? '');
        }

        return [
            'bn_id' => (int)($row['bn_id'] ?? 0),
            'bo_table' => $boTable,
            'bo_subject' => (string)($row['bo_subject'] ?? ''),
            'gr_id' => (string)($row['gr_id'] ?? ''),
            'gr_subject' => (string)($row['gr_subject'] ?? ''),
            'wr_id' => $wrId,
            'wr_parent' => $wrParent,
            'bn_datetime' => (string)($row['bn_datetime'] ?? ''),
            'mb_id' => (string)($row['mb_id'] ?? ''),
            'view_type' => $wrId === $wrParent ? 'w' : 'c',
            'wr_subject' => (string)($postData['wr_subject'] ?? ''),
            'wr_name' => (string)($postData['wr_name'] ?? ''),
            'wr_datetime' => (string)($postData['wr_datetime'] ?? ''),
            'post_mb_id' => (string)($postData['mb_id'] ?? ''),
            'parent_wr_subject' => $parentSubject,
            'post_exists' => is_array($post),
        ];
    }
}
