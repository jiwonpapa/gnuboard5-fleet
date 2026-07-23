<?php

declare(strict_types=1);

namespace Api\Board\Service\Support;

final class BoardDetailPresenter
{
    /**
     * @param array<string,mixed> $board
     * @return array<string,mixed>
     */
    public function toDetail(array $board): array
    {
        return [
            'bo_table' => (string)($board['bo_table'] ?? ''),
            'bo_subject' => (string)($board['bo_subject'] ?? ''),
            'gr_id' => (string)($board['gr_id'] ?? ''),
            'bo_admin' => (string)($board['bo_admin'] ?? ''),
            'gr_admin' => (string)($board['gr_admin'] ?? ''),
            'gr_use_access' => (int)($board['gr_use_access'] ?? 0),
            'bo_read_level' => (int)($board['bo_read_level'] ?? 0),
            'bo_write_level' => (int)($board['bo_write_level'] ?? 0),
            'bo_reply_level' => (int)($board['bo_reply_level'] ?? 0),
            'bo_comment_level' => (int)($board['bo_comment_level'] ?? 0),
            'bo_use_category' => (int)($board['bo_use_category'] ?? 0),
            'bo_category_list' => (string)($board['bo_category_list'] ?? ''),
            'bo_count_delete' => (int)($board['bo_count_delete'] ?? 0),
            'bo_count_write' => (int)($board['bo_count_write'] ?? 0),
            'bo_count_comment' => (int)($board['bo_count_comment'] ?? 0),
            'bo_use_secret' => (int)($board['bo_use_secret'] ?? 0),
            'bo_use_dhtml_editor' => (int)($board['bo_use_dhtml_editor'] ?? 0),
            'bo_upload_count' => (int)($board['bo_upload_count'] ?? 0),
            'bo_upload_size' => (int)($board['bo_upload_size'] ?? 0),
            'bo_list_level' => (int)($board['bo_list_level'] ?? 0),
            'bo_download_level' => (int)($board['bo_download_level'] ?? 0),
            'bo_read_point' => (int)($board['bo_read_point'] ?? 0),
            'bo_write_point' => (int)($board['bo_write_point'] ?? 0),
            'bo_comment_point' => (int)($board['bo_comment_point'] ?? 0),
            'bo_download_point' => (int)($board['bo_download_point'] ?? 0),
        ];
    }
}
