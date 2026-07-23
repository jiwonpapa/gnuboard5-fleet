<?php

declare(strict_types=1);

namespace Api\Comment\Service\Support;

final class CommentPresenter
{
    /** @param array<string,mixed> $comment @return array<string,mixed> */
    public function present(array $comment): array
    {
        return [
            'wr_id' => (int)($comment['wr_id'] ?? 0),
            'wr_parent' => (int)($comment['wr_parent'] ?? 0),
            'wr_comment' => (int)($comment['wr_comment'] ?? 0),
            'wr_comment_reply' => (string)($comment['wr_comment_reply'] ?? ''),
            'wr_content' => (string)($comment['wr_content'] ?? ''),
            'wr_name' => (string)($comment['wr_name'] ?? ''),
            'wr_datetime' => (string)($comment['wr_datetime'] ?? ''),
            'mb_id' => (string)($comment['mb_id'] ?? ''),
        ];
    }
}
