<?php

declare(strict_types=1);

namespace Api\Core\DTO;

final class FileDTO implements \JsonSerializable
{
    public function __construct(
        public readonly string $boTable,
        public readonly int $wrId,
        public readonly int $bfNo,
        public readonly string $bfSource,
        public readonly string $bfFile,
        public readonly int $bfDownload,
        public readonly int $bfFilesize,
        public readonly int $bfWidth,
        public readonly int $bfHeight,
        public readonly int $bfType,
        public readonly string $bfDatetime,
        public readonly string $bfContent = '',
        public readonly string $bfFileurl = '',
        public readonly string $bfThumburl = '',
        public readonly string $bfStorage = '',
        public readonly string $bfFileMime = ''
    ) {
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            boTable: (string)($row['bo_table'] ?? ''),
            wrId: (int)($row['wr_id'] ?? 0),
            bfNo: (int)($row['bf_no'] ?? 0),
            bfSource: (string)($row['bf_source'] ?? ''),
            bfFile: (string)($row['bf_file'] ?? ''),
            bfDownload: (int)($row['bf_download'] ?? 0),
            bfFilesize: (int)($row['bf_filesize'] ?? 0),
            bfWidth: (int)($row['bf_width'] ?? 0),
            bfHeight: (int)($row['bf_height'] ?? 0),
            bfType: (int)($row['bf_type'] ?? 0),
            bfDatetime: (string)($row['bf_datetime'] ?? ''),
            bfContent: (string)($row['bf_content'] ?? ''),
            bfFileurl: (string)($row['bf_fileurl'] ?? ''),
            bfThumburl: (string)($row['bf_thumburl'] ?? ''),
            bfStorage: (string)($row['bf_storage'] ?? ''),
            bfFileMime: (string)($row['bf_file_mime'] ?? '')
        );
    }

    /**
     * @return array<string, int|string>
     */
    public function jsonSerialize(): array
    {
        return [
            'bo_table' => $this->boTable,
            'wr_id' => $this->wrId,
            'bf_no' => $this->bfNo,
            'bf_source' => $this->bfSource,
            'bf_file' => $this->bfFile,
            'bf_content' => $this->bfContent,
            'bf_fileurl' => $this->bfFileurl,
            'bf_thumburl' => $this->bfThumburl,
            'bf_storage' => $this->bfStorage,
            'bf_download' => $this->bfDownload,
            'bf_filesize' => $this->bfFilesize,
            'bf_width' => $this->bfWidth,
            'bf_height' => $this->bfHeight,
            'bf_type' => $this->bfType,
            'bf_datetime' => $this->bfDatetime,
            'bf_file_mime' => $this->bfFileMime,
        ];
    }
}
