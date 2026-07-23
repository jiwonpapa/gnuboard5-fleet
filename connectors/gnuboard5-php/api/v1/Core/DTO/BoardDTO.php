<?php

/**
 * 게시판 정보를 캡슐화하는 불변 데이터 전송 객체.
 *
 * @package  Api\Core\DTO
 * @since    v1.1.0
 */

declare(strict_types=1);

namespace Api\Core\DTO;

final class BoardDTO implements \JsonSerializable
{
    public function __construct(
        public readonly string $boTable,
        public readonly string $boSubject,
        public readonly string $grId,
        public readonly string $boAdmin,
        public readonly string $grAdmin,
        public readonly int $grUseAccess,
        public readonly int $boReadLevel,
        public readonly int $boWriteLevel,
        public readonly int $boReplyLevel,
        public readonly int $boCommentLevel,
        public readonly int $boUseCategory,
        public readonly string $boCategoryList,
        public readonly int $boCountDelete,
        public readonly int $boCountWrite,
        public readonly int $boCountComment,
        public readonly int $boUseSecret,
        public readonly int $boUseDhtmlEditor,
        public readonly int $boUploadCount,
        public readonly int $boUploadSize,
        public readonly int $boListLevel,
        public readonly int $boDownloadLevel,
        public readonly int $boReadPoint,
        public readonly int $boWritePoint,
        public readonly int $boCommentPoint,
        public readonly int $boDownloadPoint
    ) {
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            boTable: (string)($row['bo_table'] ?? ''),
            boSubject: (string)($row['bo_subject'] ?? ''),
            grId: (string)($row['gr_id'] ?? ''),
            boAdmin: (string)($row['bo_admin'] ?? ''),
            grAdmin: (string)($row['gr_admin'] ?? ''),
            grUseAccess: (int)($row['gr_use_access'] ?? 0),
            boReadLevel: (int)($row['bo_read_level'] ?? 0),
            boWriteLevel: (int)($row['bo_write_level'] ?? 0),
            boReplyLevel: (int)($row['bo_reply_level'] ?? 0),
            boCommentLevel: (int)($row['bo_comment_level'] ?? 0),
            boUseCategory: (int)($row['bo_use_category'] ?? 0),
            boCategoryList: (string)($row['bo_category_list'] ?? ''),
            boCountDelete: (int)($row['bo_count_delete'] ?? 0),
            boCountWrite: (int)($row['bo_count_write'] ?? 0),
            boCountComment: (int)($row['bo_count_comment'] ?? 0),
            boUseSecret: (int)($row['bo_use_secret'] ?? 0),
            boUseDhtmlEditor: (int)($row['bo_use_dhtml_editor'] ?? 0),
            boUploadCount: (int)($row['bo_upload_count'] ?? 0),
            boUploadSize: (int)($row['bo_upload_size'] ?? 0),
            boListLevel: (int)($row['bo_list_level'] ?? 0),
            boDownloadLevel: (int)($row['bo_download_level'] ?? 0),
            boReadPoint: (int)($row['bo_read_point'] ?? 0),
            boWritePoint: (int)($row['bo_write_point'] ?? 0),
            boCommentPoint: (int)($row['bo_comment_point'] ?? 0),
            boDownloadPoint: (int)($row['bo_download_point'] ?? 0)
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return [
            'bo_table' => $this->boTable,
            'bo_subject' => $this->boSubject,
            'gr_id' => $this->grId,
            'bo_admin' => $this->boAdmin,
            'gr_admin' => $this->grAdmin,
            'gr_use_access' => $this->grUseAccess,
            'bo_read_level' => $this->boReadLevel,
            'bo_write_level' => $this->boWriteLevel,
            'bo_reply_level' => $this->boReplyLevel,
            'bo_comment_level' => $this->boCommentLevel,
            'bo_use_category' => $this->boUseCategory,
            'bo_category_list' => $this->boCategoryList,
            'bo_count_delete' => $this->boCountDelete,
            'bo_count_write' => $this->boCountWrite,
            'bo_count_comment' => $this->boCountComment,
            'bo_use_secret' => $this->boUseSecret,
            'bo_use_dhtml_editor' => $this->boUseDhtmlEditor,
            'bo_upload_count' => $this->boUploadCount,
            'bo_upload_size' => $this->boUploadSize,
            'bo_list_level' => $this->boListLevel,
            'bo_download_level' => $this->boDownloadLevel,
            'bo_read_point' => $this->boReadPoint,
            'bo_write_point' => $this->boWritePoint,
            'bo_comment_point' => $this->boCommentPoint,
            'bo_download_point' => $this->boDownloadPoint,
        ];
    }
}
