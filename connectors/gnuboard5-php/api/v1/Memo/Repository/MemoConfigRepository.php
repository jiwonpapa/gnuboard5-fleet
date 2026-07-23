<?php

declare(strict_types=1);

namespace Api\Memo\Repository;

final class MemoConfigRepository extends MemoRepositorySupport
{
    public function getMemoSendPoint(): int
    {
        $configTable = $this->tables()->get('config');
        $row = $this->fetchAssociative(
            "SELECT cf_memo_send_point
             FROM {$configTable}
             LIMIT 1"
        );

        return (int)($row['cf_memo_send_point'] ?? 0);
    }
}
