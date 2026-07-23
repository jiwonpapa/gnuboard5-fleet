<?php

declare(strict_types=1);

namespace Api\Post\Repository;

use Api\Core\DTO\PostDTO;

abstract class PostQuerySupport extends PostRepositorySupport
{
    /**
     * @return array<int, int>
     */
    protected function parseNoticeIds(string $boNotice): array
    {
        $result = [];
        foreach (explode(',', trim($boNotice)) as $token) {
            $token = trim($token);
            if ($token === '' || !ctype_digit($token)) {
                continue;
            }

            $value = (int)$token;
            if ($value > 0) {
                $result[] = $value;
            }
        }

        return array_values(array_unique($result));
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    protected function normalizePostRow(array $row): array
    {
        $base = PostDTO::fromRow($row)->jsonSerialize();

        $base['wr_datetime'] = (string)($base['wr_datetime'] ?? '');
        $base['wr_last'] = (string)($row['wr_last'] ?? '');
        $base['wr_password'] = (string)($row['wr_password'] ?? '');
        $base['wr_link1'] = (string)($row['wr_link1'] ?? '');
        $base['wr_link2'] = (string)($row['wr_link2'] ?? '');
        $base['wr_link1_hit'] = (int)($row['wr_link1_hit'] ?? 0);
        $base['wr_link2_hit'] = (int)($row['wr_link2_hit'] ?? 0);
        $base['is_notice'] = false;

        return $base;
    }
}
