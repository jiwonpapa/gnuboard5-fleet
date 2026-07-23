<?php

declare(strict_types=1);

namespace Api\Post\Repository;

final class PostNewPostMutationRepository extends PostRepositorySupport
{
    /**
     * @param array<int, mixed> $bnIds
     * @return array<int, array<string,mixed>>
     */
    public function findNewPostTargets(array $bnIds): array
    {
        $safeIds = $this->sanitizeBnIds($bnIds);
        if ($safeIds === []) {
            return [];
        }

        [$params, $placeholders] = $this->buildBnIdBindings($safeIds);
        return $this->fetchAllAssociative(
            "SELECT bn_id, bo_table, wr_id, wr_parent
             FROM {$this->tables()->get('board_new')}
             WHERE bn_id IN (" . implode(', ', $placeholders) . ")
             ORDER BY bn_id DESC",
            $params
        );
    }

    /**
     * @param array<int, mixed> $bnIds
     */
    public function deleteNewPosts(array $bnIds): void
    {
        $safeIds = $this->sanitizeBnIds($bnIds);
        if ($safeIds === []) {
            return;
        }

        [$params, $placeholders] = $this->buildBnIdBindings($safeIds);
        $this->executeStatement(
            "DELETE FROM {$this->tables()->get('board_new')}
             WHERE bn_id IN (" . implode(', ', $placeholders) . ")",
            $params
        );
    }

    /**
     * @param array<int, mixed> $bnIds
     * @return array<int, int>
     */
    private function sanitizeBnIds(array $bnIds): array
    {
        $safeIds = [];
        foreach ($bnIds as $bnId) {
            $value = is_numeric((string)$bnId) ? (int)$bnId : 0;
            if ($value > 0) {
                $safeIds[] = $value;
            }
        }

        return array_values(array_unique($safeIds));
    }

    /**
     * @param array<int, int> $safeIds
     * @return array{0:array<string,mixed>,1:array<int,string>}
     */
    private function buildBnIdBindings(array $safeIds): array
    {
        $params = [];
        $placeholders = [];
        foreach ($safeIds as $idx => $bnId) {
            $key = 'bn_id_' . $idx;
            $placeholders[] = ':' . $key;
            $params[$key] = $bnId;
        }

        return [$params, $placeholders];
    }
}
