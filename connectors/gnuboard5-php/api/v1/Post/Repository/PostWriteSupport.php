<?php

declare(strict_types=1);

namespace Api\Post\Repository;

abstract class PostWriteSupport extends PostRepositorySupport
{
    protected function containsSecretOption(string $option): bool
    {
        if ($option === '') {
            return false;
        }

        $tokens = array_filter(array_map('trim', explode(',', $option)));

        return in_array('secret', $tokens, true);
    }

    protected function resolveInsertedWriteId(
        string $writeTable,
        string $memberId,
        string $datetime,
        string $subject,
        string $content,
        string $reply
    ): int {
        $row = $this->fetchAssociative(
            "SELECT wr_id
             FROM {$writeTable}
             WHERE mb_id = :mb_id
               AND wr_datetime = :wr_datetime
               AND wr_subject = :wr_subject
               AND wr_content = :wr_content
               AND wr_reply = :wr_reply
               AND wr_is_comment = 0
             ORDER BY wr_id DESC
             LIMIT 1",
            [
                'mb_id' => $memberId,
                'wr_datetime' => $datetime,
                'wr_subject' => $subject,
                'wr_content' => $content,
                'wr_reply' => $reply,
            ]
        );

        return (int)($row['wr_id'] ?? 0);
    }
}
