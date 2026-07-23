<?php

declare(strict_types=1);

namespace Api\Post\Service\Support;

final class PostPublicPresenter
{
    /** @param array<string,mixed> $post @return array<string,mixed> */
    public function present(array $post): array
    {
        return [
            'wr_id' => (int)($post['wr_id'] ?? 0),
            'wr_num' => (int)($post['wr_num'] ?? 0),
            'wr_parent' => (int)($post['wr_parent'] ?? 0),
            'wr_is_comment' => (int)($post['wr_is_comment'] ?? 0),
            'wr_comment' => (int)($post['wr_comment'] ?? 0),
            'wr_comment_reply' => (string)($post['wr_comment_reply'] ?? ''),
            'wr_subject' => (string)($post['wr_subject'] ?? ''),
            'wr_content' => (string)($post['wr_content'] ?? ''),
            'wr_name' => (string)($post['wr_name'] ?? ''),
            'wr_email' => $this->nullableString($post['wr_email'] ?? null),
            'wr_hp' => $this->nullableString($post['wr_hp'] ?? null),
            'wr_datetime' => (string)($post['wr_datetime'] ?? ''),
            'wr_last' => (string)($post['wr_last'] ?? ''),
            'wr_hit' => (int)($post['wr_hit'] ?? 0),
            'wr_good' => (int)($post['wr_good'] ?? 0),
            'wr_nogood' => (int)($post['wr_nogood'] ?? 0),
            'wr_option' => (string)($post['wr_option'] ?? ''),
            'ca_name' => $this->nullableString($post['ca_name'] ?? null),
            'mb_id' => $this->nullableString($post['mb_id'] ?? null),
            'wr_link1' => (string)($post['wr_link1'] ?? ''),
            'wr_link2' => (string)($post['wr_link2'] ?? ''),
            'wr_link1_hit' => (int)($post['wr_link1_hit'] ?? 0),
            'wr_link2_hit' => (int)($post['wr_link2_hit'] ?? 0),
            'is_notice' => (bool)($post['is_notice'] ?? false),
        ];
    }

    private function nullableString(mixed $value): ?string
    {
        return $value === null ? null : (string)$value;
    }
}
