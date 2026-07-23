<?php

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\DTO\PostDTO;
use Api\Core\DTO\PostScrapDTO;
use Api\Support\Validation\BoTable;
use Throwable;

final class PostScrapHydratorRepository extends PostRepositorySupport
{
    /**
     * @param array<int, array<string, mixed>> $rows
     * @return list<PostScrapDTO>
     */
    public function hydrateScrapItems(array $rows): array
    {
        $posts = $this->loadPostsForScraps($rows);
        $items = [];

        foreach ($rows as $row) {
            $boTable = trim((string)($row['bo_table'] ?? ''));
            $wrId = (int)($row['wr_id'] ?? 0);
            $postData = $posts[$this->scrapKey($boTable, $wrId)] ?? [];

            $items[] = PostScrapDTO::fromRow([
                'ms_id' => (int)($row['ms_id'] ?? 0),
                'bo_table' => $boTable,
                'bo_subject' => (string)($row['bo_subject'] ?? ''),
                'wr_id' => $wrId,
                'wr_subject' => (string)($postData['wr_subject'] ?? ''),
                'wr_name' => (string)($postData['wr_name'] ?? ''),
                'wr_datetime' => (string)($postData['wr_datetime'] ?? ''),
                'mb_id' => (string)($postData['mb_id'] ?? ''),
                'ms_datetime' => (string)($row['ms_datetime'] ?? ''),
                'post_exists' => $postData !== [],
            ]);
        }

        return $items;
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<string, array<string, mixed>>
     */
    private function loadPostsForScraps(array $rows): array
    {
        $groupedWrIds = [];
        $writeTables = [];

        foreach ($rows as $row) {
            $boTable = trim((string)($row['bo_table'] ?? ''));
            $wrId = (int)($row['wr_id'] ?? 0);
            $writeTable = $this->safeWriteTable($boTable);
            if ($writeTable === null || $wrId <= 0) {
                continue;
            }

            $writeTables[$boTable] = $writeTable;
            $groupedWrIds[$boTable][$wrId] = true;
        }

        $posts = [];
        foreach ($groupedWrIds as $boTable => $wrIdMap) {
            $writeTable = $writeTables[$boTable] ?? null;
            if ($writeTable === null) {
                continue;
            }

            $params = [];
            $placeholders = [];
            foreach (array_keys($wrIdMap) as $index => $wrId) {
                $param = 'wr_id_' . $index;
                $params[$param] = (int)$wrId;
                $placeholders[] = ':' . $param;
            }

            $postRows = $this->fetchAllAssociative(
                "SELECT wr_id, wr_subject, wr_name, wr_datetime, mb_id
                 FROM {$writeTable}
                 WHERE wr_is_comment = 0
                   AND wr_id IN (" . implode(', ', $placeholders) . ')',
                $params
            );

            foreach ($postRows as $postRow) {
                $wrId = (int)($postRow['wr_id'] ?? 0);
                $posts[$this->scrapKey($boTable, $wrId)] = PostDTO::fromRow($postRow)->jsonSerialize();
            }
        }

        return $posts;
    }

    private function safeWriteTable(string $boTable): ?string
    {
        try {
            return $this->boardRepository->getWriteTable(BoTable::normalize($boTable));
        } catch (Throwable) {
            return null;
        }
    }

    private function scrapKey(string $boTable, int $wrId): string
    {
        return $boTable . ':' . $wrId;
    }
}
