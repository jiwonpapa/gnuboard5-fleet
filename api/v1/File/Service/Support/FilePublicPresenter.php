<?php

declare(strict_types=1);

namespace Api\File\Service\Support;

final class FilePublicPresenter
{
    /** @param array<string,mixed> $file @return array<string,int|string> */
    public function present(array $file): array
    {
        return [
            'bo_table' => (string)($file['bo_table'] ?? ''),
            'wr_id' => (int)($file['wr_id'] ?? 0),
            'bf_no' => (int)($file['bf_no'] ?? 0),
            'bf_source' => (string)($file['bf_source'] ?? ''),
            'bf_file' => (string)($file['bf_file'] ?? ''),
            'bf_content' => (string)($file['bf_content'] ?? ''),
            'bf_fileurl' => (string)($file['bf_fileurl'] ?? ''),
            'bf_thumburl' => (string)($file['bf_thumburl'] ?? ''),
            'bf_storage' => (string)($file['bf_storage'] ?? ''),
            'bf_download' => (int)($file['bf_download'] ?? 0),
            'bf_filesize' => (int)($file['bf_filesize'] ?? 0),
            'bf_width' => (int)($file['bf_width'] ?? 0),
            'bf_height' => (int)($file['bf_height'] ?? 0),
            'bf_type' => (int)($file['bf_type'] ?? 0),
            'bf_datetime' => (string)($file['bf_datetime'] ?? ''),
            'bf_file_mime' => (string)($file['bf_file_mime'] ?? ''),
        ];
    }
}
