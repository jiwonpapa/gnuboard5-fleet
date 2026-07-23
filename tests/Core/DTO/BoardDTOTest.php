<?php

declare(strict_types=1);

namespace Tests\Core\DTO;

use Api\Core\DTO\BoardDTO;
use PHPUnit\Framework\TestCase;

final class BoardDTOTest extends TestCase
{
    public function testFromRowAndJsonSerialize(): void
    {
        $dto = BoardDTO::fromRow([
            'bo_table' => 'free',
            'bo_subject' => '자유게시판',
            'gr_id' => 'community',
            'bo_admin' => 'admin',
            'gr_admin' => 'groupadmin',
            'gr_use_access' => 1,
            'bo_read_level' => 1,
            'bo_write_level' => 2,
            'bo_reply_level' => 2,
            'bo_comment_level' => 2,
            'bo_use_category' => 1,
            'bo_category_list' => '공지|일반',
            'bo_count_delete' => 3,
            'bo_count_write' => 0,
            'bo_count_comment' => 0,
            'bo_use_secret' => 1,
            'bo_use_dhtml_editor' => 1,
            'bo_upload_count' => 2,
            'bo_upload_size' => 1048576,
            'bo_list_level' => 1,
            'bo_download_level' => 1,
            'bo_read_point' => -1,
            'bo_write_point' => 10,
            'bo_comment_point' => 1,
            'bo_download_point' => -10,
        ]);

        $this->assertSame('free', $dto->boTable);
        $payload = $dto->jsonSerialize();
        $this->assertSame('자유게시판', $payload['bo_subject']);
        $this->assertSame(2, $payload['bo_upload_count']);
    }
}
